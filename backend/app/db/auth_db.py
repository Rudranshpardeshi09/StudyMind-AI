"""SQLite access layer.

Every connection enables foreign keys explicitly: SQLite defaults the pragma to
OFF per-connection, which silently made the ON DELETE CASCADE clauses on
chat_messages inert. Schema changes are applied through an additive migration
list so existing data is preserved.
"""

import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


def _db_path() -> Path:
    path = Path(settings.DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _configure(conn: sqlite3.Connection) -> None:
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA synchronous = NORMAL")


@contextmanager
def get_connection():
    conn = sqlite3.connect(_db_path(), timeout=10)
    try:
        _configure(conn)
        yield conn
    finally:
        conn.close()


MIGRATIONS: list[tuple[str, str]] = [
    (
        "0001_users",
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE,
            password_hash TEXT,
            google_sub TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (email),
            UNIQUE (google_sub)
        );
        """,
    ),
    (
        "0002_chat",
        """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            syllabus_context TEXT,
            marks INTEGER NOT NULL DEFAULT 3,
            document_names_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            sources_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
            ON chat_sessions(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
            ON chat_messages(session_id, created_at ASC, id ASC);
        """,
    ),
    (
        "0003_documents",
        """
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            content_hash TEXT,
            byte_size INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'queued'
                CHECK(status IN ('queued','uploading','parsing','embedding','ready','failed')),
            pages INTEGER NOT NULL DEFAULT 0,
            chunk_count INTEGER NOT NULL DEFAULT 0,
            error TEXT,
            project_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_stored
            ON documents(user_id, stored_name);
        CREATE INDEX IF NOT EXISTS idx_documents_user_created
            ON documents(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_documents_user_hash
            ON documents(user_id, content_hash);

        CREATE TABLE IF NOT EXISTS document_chunks (
            chunk_id TEXT NOT NULL,
            document_id TEXT NOT NULL,
            page INTEGER NOT NULL DEFAULT 1,
            ordinal INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (document_id, chunk_id),
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_document_chunks_doc
            ON document_chunks(document_id);
        """,
    ),
    (
        "0004_mind_maps",
        """
        CREATE TABLE IF NOT EXISTS mind_maps (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            source_label TEXT NOT NULL DEFAULT '',
            mode TEXT NOT NULL DEFAULT 'full',
            tree_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_mind_maps_user_created
            ON mind_maps(user_id, created_at DESC);
        """,
    ),
    (
        "0005_preferences",
        """
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY,
            default_marks INTEGER NOT NULL DEFAULT 3,
            theme TEXT NOT NULL DEFAULT 'system',
            syllabus_context TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """,
    ),
    (
        "0006_prune_orphan_messages",
        """
        DELETE FROM chat_messages
        WHERE session_id NOT IN (SELECT id FROM chat_sessions);
        """,
    ),
]


def init_db() -> None:
    conn = sqlite3.connect(_db_path(), timeout=10)
    try:
        _configure(conn)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        applied = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
        for name, sql in MIGRATIONS:
            if name in applied:
                continue
            conn.executescript(sql)
            conn.execute("INSERT INTO schema_migrations (name) VALUES (?)", (name,))
            logger.info("Applied migration %s", name)
        conn.commit()
    finally:
        conn.close()
