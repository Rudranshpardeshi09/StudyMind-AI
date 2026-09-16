"""Per-user filesystem layout.

Single place that turns a user id + a logical name into a real path. Every
filesystem access in the application goes through here so that forgetting to
scope a path is a structural impossibility rather than a review catch.

Layout:
    DATA_DIR/users/<user_id>/uploads/<stored_name>
    DATA_DIR/users/<user_id>/index/            (FAISS index for that user)
"""

import os
import re
import shutil
from pathlib import Path

from app.core.config import settings

_SAFE_SEGMENT = re.compile(r"^[A-Za-z0-9._ -]+$")


class UnsafePathError(ValueError):
    """Raised when a candidate path would escape its user's root."""


class UserStorage:
    """Filesystem accessor bound to exactly one user."""

    __slots__ = ("user_id", "_root")

    def __init__(self, user_id: int):
        if not isinstance(user_id, int) or user_id <= 0:
            raise ValueError("user_id must be a positive integer")
        self.user_id = user_id
        self._root = (Path(settings.USERS_DIR) / str(user_id)).resolve()

    # --- roots ---
    @property
    def root(self) -> Path:
        return self._root

    @property
    def uploads_dir(self) -> Path:
        return self._root / "uploads"

    @property
    def index_dir(self) -> Path:
        return self._root / "index"

    def ensure(self) -> None:
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)

    # --- safe resolution ---
    def _contained(self, base: Path, name: str) -> Path:
        """Resolve `name` under `base`, refusing anything that escapes it."""
        if not name or name in {".", ".."}:
            raise UnsafePathError("Invalid file name")
        # Reject separators and traversal before touching the filesystem.
        if os.sep in name or (os.altsep and os.altsep in name) or ".." in name:
            raise UnsafePathError("Invalid file name")
        if not _SAFE_SEGMENT.match(name):
            raise UnsafePathError("Invalid file name")

        base = base.resolve()
        candidate = (base / name).resolve()
        # Path.is_relative_to is exact and avoids commonpath's drive quirks.
        if candidate != base and not candidate.is_relative_to(base):
            raise UnsafePathError("Invalid file path")
        return candidate

    def upload_path(self, stored_name: str) -> Path:
        return self._contained(self.uploads_dir, stored_name)

    def has_index(self) -> bool:
        return (self.index_dir / "index.faiss").exists() and (
            self.index_dir / "index.pkl"
        ).exists()

    # --- maintenance ---
    def delete_index(self) -> None:
        shutil.rmtree(self.index_dir, ignore_errors=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)

    def purge(self) -> None:
        """Remove every file belonging to this user."""
        shutil.rmtree(self._root, ignore_errors=True)
        self.ensure()

    def usage_bytes(self) -> int:
        total = 0
        for path in self.uploads_dir.glob("*"):
            if path.is_file():
                total += path.stat().st_size
        return total


def storage_for(user_id: int) -> UserStorage:
    store = UserStorage(user_id)
    store.ensure()
    return store
