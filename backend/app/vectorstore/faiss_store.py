import json
import logging
import os
import shutil
import threading
from collections import OrderedDict
from pathlib import Path

from app.core.config import settings
from app.core.storage import UserStorage
from app.vectorstore.embeddings import build_embeddings, embedding_signature
from app.vectorstore.vector_index import DOCSTORE_FILE, INDEX_FILE, VectorIndex

logger = logging.getLogger(__name__)

METADATA_FILE = "embedding.json"

_embeddings_cache = None
_embeddings_lock = threading.Lock()

_registry_lock = threading.Lock()
_locks: dict[int, threading.RLock] = {}
_cache: "OrderedDict[int, tuple[object, tuple]]" = OrderedDict()


class IncompatibleIndexError(RuntimeError):
    pass


def get_embeddings():
    global _embeddings_cache
    if _embeddings_cache is None:
        with _embeddings_lock:
            if _embeddings_cache is None:
                _embeddings_cache = build_embeddings()
    return _embeddings_cache


def _read_signature(index_dir: Path):
    try:
        return json.loads((index_dir / METADATA_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _write_signature(index_dir: Path, dimensions: int) -> None:
    signature = dict(embedding_signature())
    signature["dimensions"] = int(dimensions)
    (index_dir / METADATA_FILE).write_text(json.dumps(signature), encoding="utf-8")


def _incompatibility(stored) -> str | None:
    if not isinstance(stored, dict):
        return "no embedding metadata"
    expected = embedding_signature()
    for key in ("provider", "model"):
        if stored.get(key) != expected[key]:
            return f"{key} {stored.get(key)!r} != {expected[key]!r}"
    if expected["dimensions"] is not None and stored.get("dimensions") != expected["dimensions"]:
        return f"dimensions {stored.get('dimensions')!r} != {expected['dimensions']!r}"
    return None


def index_lock(user_id: int) -> threading.RLock:
    with _registry_lock:
        lock = _locks.get(user_id)
        if lock is None:
            lock = threading.RLock()
            _locks[user_id] = lock
        return lock


def _fingerprint(storage: UserStorage):
    faiss_path = storage.index_dir / INDEX_FILE
    store_path = storage.index_dir / DOCSTORE_FILE
    if not faiss_path.exists():
        return None
    if not store_path.exists():
        return ("legacy",)
    return (
        faiss_path.stat().st_mtime_ns,
        store_path.stat().st_mtime_ns,
        faiss_path.stat().st_size,
        store_path.stat().st_size,
    )


def invalidate(user_id: int) -> None:
    with _registry_lock:
        _cache.pop(user_id, None)


def _cache_put(user_id: int, db, fingerprint) -> None:
    with _registry_lock:
        _cache[user_id] = (db, fingerprint)
        _cache.move_to_end(user_id)
        while len(_cache) > max(1, settings.MAX_CACHED_INDEXES):
            evicted, _ = _cache.popitem(last=False)
            logger.info("Evicted cached index for user %s", evicted)


def load_index(storage: UserStorage):
    user_id = storage.user_id
    fingerprint = _fingerprint(storage)
    if fingerprint is None:
        return None

    with _registry_lock:
        cached = _cache.get(user_id)
        if cached and cached[1] == fingerprint:
            _cache.move_to_end(user_id)
            return cached[0]

    with index_lock(user_id):
        fingerprint = _fingerprint(storage)
        if fingerprint is None:
            return None
        stored = _read_signature(storage.index_dir)
        reason = "legacy index format" if fingerprint == ("legacy",) else _incompatibility(stored)
        if reason is None:
            try:
                db = VectorIndex.load(storage.index_dir, get_embeddings())
            except (OSError, ValueError, KeyError, RuntimeError) as exc:
                reason = f"unreadable index: {exc}"
            else:
                if db.dimensions != stored.get("dimensions"):
                    reason = f"index dimension {db.dimensions} != metadata {stored.get('dimensions')!r}"
        if reason is not None:
            logger.warning(
                "Index for user %s was built with different embeddings (%s); it must be rebuilt",
                user_id, reason,
            )
            raise IncompatibleIndexError(reason)
        _cache_put(user_id, db, fingerprint)
        logger.info("Loaded index for user %s", user_id)
        return db


def _save_atomic(db, storage: UserStorage) -> None:
    tmp_dir = storage.root / "index.tmp"
    old_dir = storage.root / "index.old"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    shutil.rmtree(old_dir, ignore_errors=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    db.save(tmp_dir)
    _write_signature(tmp_dir, db.dimensions)
    try:
        if storage.index_dir.exists():
            os.rename(storage.index_dir, old_dir)
        os.rename(tmp_dir, storage.index_dir)
    finally:
        shutil.rmtree(old_dir, ignore_errors=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)
    invalidate(storage.user_id)


def add_chunks(storage: UserStorage, chunks: list, on_rebuild=None) -> int:
    if not chunks:
        return 0

    ids = [c.metadata["chunk_id"] for c in chunks]
    embeddings = get_embeddings()

    with index_lock(storage.user_id):
        try:
            existing = load_index(storage)
        except IncompatibleIndexError:
            storage.delete_index()
            invalidate(storage.user_id)
            existing = None
            if on_rebuild is not None:
                on_rebuild()
        if existing is None:
            db = VectorIndex.from_documents(chunks, embeddings, ids=ids)
            _save_atomic(db, storage)
            return len(chunks)

        added = existing.add_documents(chunks, ids)
        if not added:
            logger.info("All %s chunks already indexed for user %s", len(chunks), storage.user_id)
            return 0
        _save_atomic(existing, storage)
        return added


def delete_chunks(storage: UserStorage, chunk_ids: list[str]) -> int:
    if not chunk_ids:
        return 0

    with index_lock(storage.user_id):
        try:
            db = load_index(storage)
        except IncompatibleIndexError:
            return 0
        if db is None:
            return 0

        present = [cid for cid in chunk_ids if cid in db]
        if not present:
            return 0

        if len(present) >= len(db):
            storage.delete_index()
            invalidate(storage.user_id)
            return len(present)

        db.delete(present)
        _save_atomic(db, storage)
        return len(present)


def reset_index(storage: UserStorage) -> None:
    with index_lock(storage.user_id):
        storage.delete_index()
        invalidate(storage.user_id)


def index_size(storage: UserStorage) -> int:
    db = load_index(storage)
    return len(db) if db is not None else 0
