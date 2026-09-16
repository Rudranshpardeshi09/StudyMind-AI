import json
import logging
import uuid
from typing import Optional

from app.core.config import settings
from app.db.auth_db import get_connection

logger = logging.getLogger(__name__)


def _normalize_document_names(document_names: Optional[list[str]]) -> list[str]:
    cleaned: list[str] = []
    seen = set()
    for name in document_names or []:
        if not name:
            continue
        normalized = str(name).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(normalized)
    return cleaned


def _serialize_sources(sources: Optional[list[dict]]) -> str:
    return json.dumps(sources or [], ensure_ascii=True)


def _deserialize_json_list(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        logger.warning("Failed to decode stored JSON list")
        return []


def _build_session_title(question: str) -> str:
    compact = " ".join((question or "").split())
    if len(compact) <= 80:
        return compact or "Untitled chat"
    return compact[:77].rstrip(" ,.;:") + "..."


def _session_exists(conn, user_id: int, session_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM chat_sessions WHERE id = ? AND user_id = ? LIMIT 1",
        (session_id, user_id),
    ).fetchone()
    return row is not None


def _prune_old_sessions(conn, user_id: int) -> None:
    limit = max(1, int(settings.MAX_PERSISTED_CHAT_SESSIONS))
    rows = conn.execute(
        """
        SELECT id
        FROM chat_sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC, id DESC
        LIMIT -1 OFFSET ?
        """,
        (user_id, limit),
    ).fetchall()
    session_ids = [row["id"] for row in rows]
    if not session_ids:
        return

    placeholders = ",".join("?" for _ in session_ids)
    conn.execute(
        f"DELETE FROM chat_sessions WHERE user_id = ? AND id IN ({placeholders})",
        (user_id, *session_ids),
    )


def create_or_append_chat_turn(
    *,
    user_id: int,
    question: str,
    answer: str,
    marks: int,
    syllabus_context: Optional[str],
    document_names: Optional[list[str]],
    sources: Optional[list[dict]],
    session_id: Optional[str] = None,
) -> dict:
    normalized_docs = _normalize_document_names(document_names)
    normalized_syllabus = (syllabus_context or "").strip() or None
    normalized_question = question.strip()
    normalized_answer = answer.strip()

    if not normalized_question:
        raise ValueError("Question cannot be empty")
    if not normalized_answer:
        raise ValueError("Answer cannot be empty")

    with get_connection() as conn:
        if session_id:
            if not _session_exists(conn, user_id, session_id):
                raise ValueError("Chat session not found")
        else:
            session_id = uuid.uuid4().hex
            conn.execute(
                """
                INSERT INTO chat_sessions (
                    id, user_id, title, syllabus_context, marks, document_names_json
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_id,
                    _build_session_title(normalized_question),
                    normalized_syllabus,
                    marks,
                    json.dumps(normalized_docs, ensure_ascii=True),
                ),
            )

        conn.execute(
            """
            UPDATE chat_sessions
            SET syllabus_context = ?, marks = ?, document_names_json = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
            """,
            (
                normalized_syllabus,
                marks,
                json.dumps(normalized_docs, ensure_ascii=True),
                session_id,
                user_id,
            ),
        )
        conn.execute(
            """
            INSERT INTO chat_messages (session_id, role, content, sources_json)
            VALUES (?, 'user', ?, NULL)
            """,
            (session_id, normalized_question),
        )
        conn.execute(
            """
            INSERT INTO chat_messages (session_id, role, content, sources_json)
            VALUES (?, 'assistant', ?, ?)
            """,
            (session_id, normalized_answer, _serialize_sources(sources)),
        )
        _prune_old_sessions(conn, user_id)
        conn.commit()

    session = get_chat_session(user_id, session_id)
    if session is None:
        raise ValueError("Failed to load saved chat session")
    return session


def list_chat_sessions(user_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                cs.id,
                cs.title,
                cs.created_at,
                cs.updated_at,
                cs.marks,
                cs.document_names_json,
                COUNT(cm.id) AS message_count,
                (
                    SELECT content
                    FROM chat_messages
                    WHERE session_id = cs.id
                    ORDER BY created_at DESC, id DESC
                    LIMIT 1
                ) AS last_message_preview
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cm.session_id = cs.id
            WHERE cs.user_id = ?
            GROUP BY cs.id
            ORDER BY cs.updated_at DESC, cs.created_at DESC
            LIMIT ?
            """,
            (user_id, max(1, int(settings.MAX_PERSISTED_CHAT_SESSIONS))),
        ).fetchall()

    items = []
    for row in rows:
        preview = (row["last_message_preview"] or "").strip()
        if len(preview) > 120:
            preview = preview[:117].rstrip(" ,.;:") + "..."
        items.append(
            {
                "id": row["id"],
                "title": row["title"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "message_count": int(row["message_count"] or 0),
                "marks": int(row["marks"] or 3),
                "document_names": _deserialize_json_list(row["document_names_json"]),
                "last_message_preview": preview or None,
            }
        )
    return items


def get_chat_session(user_id: int, session_id: str) -> Optional[dict]:
    with get_connection() as conn:
        session_row = conn.execute(
            """
            SELECT id, title, created_at, updated_at, syllabus_context, marks, document_names_json
            FROM chat_sessions
            WHERE id = ? AND user_id = ?
            LIMIT 1
            """,
            (session_id, user_id),
        ).fetchone()
        if session_row is None:
            return None

        message_rows = conn.execute(
            """
            SELECT id, role, content, created_at, sources_json
            FROM chat_messages
            WHERE session_id = ?
            ORDER BY created_at ASC, id ASC
            """,
            (session_id,),
        ).fetchall()

    return {
        "id": session_row["id"],
        "title": session_row["title"],
        "created_at": session_row["created_at"],
        "updated_at": session_row["updated_at"],
        "syllabus_context": session_row["syllabus_context"],
        "marks": int(session_row["marks"] or 3),
        "document_names": _deserialize_json_list(session_row["document_names_json"]),
        "messages": [
            {
                "id": int(row["id"]),
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"],
                "sources": _deserialize_json_list(row["sources_json"]),
            }
            for row in message_rows
        ],
    }


def delete_chat_session(user_id: int, session_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
