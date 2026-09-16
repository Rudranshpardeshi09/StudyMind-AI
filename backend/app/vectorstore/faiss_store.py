"""Per-user FAISS index management.

Each user owns an index under their own storage root, so retrieval cannot cross
a tenant boundary even if a metadata filter is wrong. Indexes are held in a
bounded LRU with a per-user lock, replacing the previous single process-wide
index + global lock (which serialised every user's ingest behind every other).

Chunk ids are used as the FAISS docstore ids, which is what makes incremental
deletion possible instead of rebuilding the whole corpus.
"""

import logging
import os
import shutil
import threading
from collections import OrderedDict
from pathlib import Path

from app.core.config import settings
from app.core.storage import UserStorage

logger = logging.getLogger(__name__)

_embeddings_cache = None
_embeddings_lock = threading.Lock()

_registry_lock = threading.Lock()
_locks: dict[int, threading.RLock] = {}
_cache: "OrderedDict[int, tuple[object, tuple]]" = OrderedDict()


def _get_faiss_class():
    from langchain_community.vectorstores import FAISS

    return FAISS


def get_embeddings():
    """Load the embedding model once per process (it is expensive)."""
    global _embeddings_cache
    if _embeddings_cache is None:
        with _embeddings_lock:
            if _embeddings_cache is None:
                logger.info("Loading embeddings model %s", settings.EMBEDDING_MODEL)
                from langchain_huggingface import HuggingFaceEmbeddings

                _embeddings_cache = HuggingFaceEmbeddings(
                    model_name=settings.EMBEDDING_MODEL,
                    encode_kwargs={
                        "normalize_embeddings": True,
                        "batch_size": settings.EMBEDDING_BATCH_SIZE,
                    },
                )
                logger.info("Embeddings model loaded")
    return _embeddings_cache


def index_lock(user_id: int) -> threading.RLock:
    """Per-user lock — one user's ingest must not block another's."""
    with _registry_lock:
        lock = _locks.get(user_id)
        if lock is None:
            lock = threading.RLock()
            _locks[user_id] = lock
        return lock


def _fingerprint(storage: UserStorage):
    faiss_path = storage.index_dir / "index.faiss"
    pkl_path = storage.index_dir / "index.pkl"
    if not (faiss_path.exists() and pkl_path.exists()):
        return None
    return (
        faiss_path.stat().st_mtime_ns,
        pkl_path.stat().st_mtime_ns,
        faiss_path.stat().st_size,
        pkl_path.stat().st_size,
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
    """Return this user's FAISS index, or None if they have not indexed anything."""
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
        FAISS = _get_faiss_class()
        db = FAISS.load_local(
            str(storage.index_dir),
            get_embeddings(),
            allow_dangerous_deserialization=True,  # index.pkl is server-generated only
        )
        _cache_put(user_id, db, fingerprint)
        logger.info("Loaded index for user %s", user_id)
        return db


def _save_atomic(db, storage: UserStorage) -> None:
    """Write the index via a temp dir + swap so a crash cannot leave it half-written."""
    tmp_dir = storage.root / "index.tmp"
    old_dir = storage.root / "index.old"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    shutil.rmtree(old_dir, ignore_errors=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    db.save_local(str(tmp_dir))
    try:
        if storage.index_dir.exists():
            os.rename(storage.index_dir, old_dir)
        os.rename(tmp_dir, storage.index_dir)
    finally:
        shutil.rmtree(old_dir, ignore_errors=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)
    invalidate(storage.user_id)


def add_chunks(storage: UserStorage, chunks: list) -> int:
    """Merge chunks into the user's index. Returns the number actually added."""
    if not chunks:
        return 0

    ids = [c.metadata["chunk_id"] for c in chunks]
    embeddings = get_embeddings()
    FAISS = _get_faiss_class()

    with index_lock(storage.user_id):
        existing = load_index(storage)
        if existing is None:
            db = FAISS.from_documents(chunks, embeddings, ids=ids)
            _save_atomic(db, storage)
            return len(chunks)

        known = set(existing.docstore._dict.keys())
        fresh = [(c, i) for c, i in zip(chunks, ids) if i not in known]
        if not fresh:
            logger.info("All %s chunks already indexed for user %s", len(chunks), storage.user_id)
            return 0

        new_db = FAISS.from_documents(
            [c for c, _ in fresh], embeddings, ids=[i for _, i in fresh]
        )
        existing.merge_from(new_db)
        _save_atomic(existing, storage)
        return len(fresh)


def delete_chunks(storage: UserStorage, chunk_ids: list[str]) -> int:
    """Remove specific chunks without touching any other document."""
    if not chunk_ids:
        return 0

    with index_lock(storage.user_id):
        db = load_index(storage)
        if db is None:
            return 0

        present = [cid for cid in chunk_ids if cid in db.docstore._dict]
        if not present:
            return 0

        # Deleting every vector leaves an empty index FAISS cannot serialise.
        if len(present) >= len(db.docstore._dict):
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
    return len(db.docstore._dict) if db is not None else 0
