import logging
import uuid
from typing import Optional

from app.core.context import UserContext
from app.db.auth_db import get_connection

logger = logging.getLogger(__name__)

VALID_STATUSES = {"queued", "parsing", "embedding", "ready", "failed"}
ACTIVE_STATUSES = ("queued", "parsing", "embedding")


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "original_name": row["original_name"],
        "stored_name": row["stored_name"],
        "status": row["status"],
        "pages": int(row["pages"] or 0),
        "chunk_count": int(row["chunk_count"] or 0),
        "byte_size": int(row["byte_size"] or 0),
        "error": row["error"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def create_document(
    ctx: UserContext,
    *,
    original_name: str,
    stored_name: str,
    byte_size: int,
    content_hash: Optional[str],
) -> dict:
    doc_id = uuid.uuid4().hex
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO documents
                (id, user_id, original_name, stored_name, content_hash, byte_size, status)
            VALUES (?, ?, ?, ?, ?, ?, 'queued')
            ON CONFLICT(user_id, stored_name) DO UPDATE SET
                original_name = excluded.original_name,
                content_hash  = excluded.content_hash,
                byte_size     = excluded.byte_size,
                status        = 'queued',
                pages         = 0,
                chunk_count   = 0,
                error         = NULL,
                updated_at    = datetime('now')
            """,
            (doc_id, ctx.user_id, original_name, stored_name, content_hash, byte_size),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? AND stored_name = ?",
            (ctx.user_id, stored_name),
        ).fetchone()
    return _row_to_dict(row)


def list_documents(ctx: UserContext) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (ctx.user_id,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_document(ctx: UserContext, document_id: str) -> Optional[dict]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1",
            (document_id, ctx.user_id),
        ).fetchone()
    return _row_to_dict(row) if row else None


def get_document_by_stored_name(ctx: UserContext, stored_name: str) -> Optional[dict]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? AND stored_name = ? LIMIT 1",
            (ctx.user_id, stored_name),
        ).fetchone()
    return _row_to_dict(row) if row else None


def find_by_hash(ctx: UserContext, content_hash: str) -> Optional[dict]:
    if not content_hash:
        return None
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM documents
            WHERE user_id = ? AND content_hash = ? AND status = 'ready'
            LIMIT 1
            """,
            (ctx.user_id, content_hash),
        ).fetchone()
    return _row_to_dict(row) if row else None


def count_documents(ctx: UserContext) -> int:
    with get_connection() as conn:
        return int(
            conn.execute(
                "SELECT COUNT(*) FROM documents WHERE user_id = ?", (ctx.user_id,)
            ).fetchone()[0]
        )


def set_status(
    document_id: str,
    status: str,
    *,
    pages: Optional[int] = None,
    chunk_count: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    if status not in VALID_STATUSES:
        raise ValueError("Unknown document status: " + str(status))

    fields = ["status = ?", "updated_at = datetime('now')"]
    params: list = [status]
    if pages is not None:
        fields.append("pages = ?")
        params.append(int(pages))
    if chunk_count is not None:
        fields.append("chunk_count = ?")
        params.append(int(chunk_count))
    fields.append("error = ?")
    params.append(error if status == "failed" else None)
    params.append(document_id)

    with get_connection() as conn:
        conn.execute(
            "UPDATE documents SET " + ", ".join(fields) + " WHERE id = ?", tuple(params)
        )
        conn.commit()


def replace_chunks(document_id: str, chunks: list[dict]) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM document_chunks WHERE document_id = ?", (document_id,))
        if chunks:
            conn.executemany(
                """
                INSERT OR IGNORE INTO document_chunks (chunk_id, document_id, page, ordinal)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (
                        c["chunk_id"],
                        document_id,
                        int(c.get("page", 1)),
                        int(c.get("ordinal", i)),
                    )
                    for i, c in enumerate(chunks)
                ],
            )
        conn.commit()


def get_chunk_ids(document_id: str) -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT chunk_id FROM document_chunks WHERE document_id = ? ORDER BY ordinal",
            (document_id,),
        ).fetchall()
    return [r["chunk_id"] for r in rows]


def delete_document(ctx: UserContext, document_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?",
            (document_id, ctx.user_id),
        )
        conn.commit()
        return cur.rowcount > 0


def delete_all_documents(ctx: UserContext) -> int:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM documents WHERE user_id = ?", (ctx.user_id,))
        conn.commit()
        return cur.rowcount


def resolve_selection(ctx: UserContext, identifiers: Optional[list[str]]) -> list[dict]:
    if not identifiers:
        return []
    wanted = {str(i).strip() for i in identifiers if str(i).strip()}
    if not wanted:
        return []

    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? AND status = 'ready'",
            (ctx.user_id,),
        ).fetchall()

    return [
        _row_to_dict(r)
        for r in rows
        if r["id"] in wanted
        or r["stored_name"] in wanted
        or r["original_name"] in wanted
    ]


def fail_interrupted_documents() -> int:
    placeholders = ",".join(["?"] * len(ACTIVE_STATUSES))
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE documents SET status = 'failed', "
            "error = 'Processing was interrupted. Retry this document.', "
            "updated_at = datetime('now') WHERE status IN (" + placeholders + ")",
            ACTIVE_STATUSES,
        )
        conn.commit()
        return cur.rowcount


REINDEX_REQUIRED_ERROR = (
    "The search index was built with a different embedding model. "
    "Retry this document to re-index it."
)


def mark_reindex_required(ctx: UserContext, exclude_id: Optional[str] = None) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE documents SET status = 'failed', error = ?, updated_at = datetime('now') "
            "WHERE user_id = ? AND status = 'ready' AND id != ?",
            (REINDEX_REQUIRED_ERROR, ctx.user_id, exclude_id or ""),
        )
        conn.commit()
        return cur.rowcount
