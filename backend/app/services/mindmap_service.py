"""Mind-map generation and storage.

Maps now live in SQLite with a user_id instead of loose JSON files in a shared
directory, so listing, opening, renaming and deleting are all owner-scoped.
Source documents are resolved through the caller's own storage.
"""

import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from app.core.context import UserContext
from app.db.auth_db import get_connection
from app.rag.prompts import build_mindmap_generation_prompt
from app.services import document_service as docs
from app.services.gemini_llm import generate_text

logger = logging.getLogger(__name__)

MAX_STRUCTURE_CHARS = 24000  # was 8000, which only saw a textbook's front matter


class MindMapError(ValueError):
    """Raised with a message that is safe to show the user."""


# --- JSON tolerance (behaviour preserved) -----------------------------------

def _extract_balanced_json_object(text: str) -> Optional[str]:
    start = text.find("{")
    if start == -1:
        return None
    depth, in_string, escaped = 0, False, False
    for index in range(start, len(text)):
        char = text[index]
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    return None


def _clean_json_text(value: str) -> str:
    cleaned = (value or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.replace("“", '"').replace("”", '"')
    cleaned = cleaned.replace("’", "'").replace("‘", "'")
    cleaned = re.sub(r",(\s*[}\]])", r"\1", cleaned)
    return cleaned.strip()


def _parse_json_response(response_text: str) -> dict:
    candidates: list[str] = []
    cleaned = _clean_json_text(response_text)
    if cleaned:
        candidates.append(cleaned)
    for candidate in (
        _extract_balanced_json_object(cleaned),
        _extract_balanced_json_object(response_text or ""),
    ):
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    raise json.JSONDecodeError("Could not parse response as JSON", cleaned or "", 0)


def _repair_json_with_llm(response_text: str, schema_hint: str) -> dict:
    prompt = (
        "You are a JSON repair assistant.\n\n"
        "Convert the following content into ONLY valid JSON.\n"
        "Do not add markdown fences. Do not add explanations.\n"
        "Preserve the original meaning. Use this schema:\n"
        f"{schema_hint}\n\nCONTENT TO REPAIR:\n---\n{response_text[:12000]}\n---"
    )
    repaired = generate_text(
        prompt, temperature=0.0, max_tokens=8192, response_mime_type="application/json"
    )
    return _parse_json_response(repaired)


# --- source text ------------------------------------------------------------

def _document_text(ctx: UserContext, document: dict) -> str:
    from app.services.ingestion_service import _load_documents

    path = ctx.storage.upload_path(document["stored_name"])
    if not path.exists():
        raise MindMapError(f"{document['original_name']} is no longer available")

    loaded = _load_documents(str(path))
    if not loaded:
        raise MindMapError(f"Could not read {document['original_name']}")
    return "\n\n".join(d.page_content.strip() for d in loaded if d.page_content.strip())


def get_text_from_sources(
    ctx: UserContext,
    source_type: str,
    source_identifiers: Optional[list[str]] = None,
    text_content: Optional[str] = None,
) -> tuple[str, str]:
    if source_type == "text":
        if not text_content or not text_content.strip():
            raise MindMapError("Text content is required")
        return text_content.strip(), "Pasted Text"

    if source_type != "uploaded_pdf":
        raise MindMapError(f"Unsupported source type: {source_type}")

    selected = docs.resolve_selection(ctx, source_identifiers)
    if not selected:
        raise MindMapError("Select at least one processed document")

    chunks, names = [], []
    for document in selected:
        chunks.append(f"--- {document['original_name']} ---\n{_document_text(ctx, document)}")
        names.append(document["original_name"])

    label = ", ".join(names)
    if len(names) > 2:
        label = f"{names[0]} +{len(names) - 1} more"
    return "\n\n".join(chunks), label


# --- structure --------------------------------------------------------------

@lru_cache(maxsize=64)
def _structure_for(cache_key: tuple) -> dict:
    """Bounded cache. The previous module-level dict grew without limit."""
    _, _, text = cache_key
    prompt = f"""Analyze this document text and extract its hierarchical structure.

Identify the main chapters/sections and their topics/subtopics.

Document text:
---
{text}
---

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "chapters": [
    {{ "name": "Chapter or section name",
       "topics": [{{"name": "Topic name"}}] }}
  ]
}}

Rules:
- Extract real chapter/section names from the document
- Each chapter should have 2-8 topics
- If the document has no clear chapters, create logical groupings from the content
- Keep names concise (max 60 characters each)
- Return at least 2 chapters and at most 12
"""
    schema_hint = '{"chapters":[{"name":"...","topics":[{"name":"..."}]}]}'
    response = generate_text(
        prompt, temperature=0.1, max_tokens=8192, response_mime_type="application/json"
    )
    try:
        structure = _parse_json_response(response)
    except json.JSONDecodeError:
        logger.warning("Structure response was not valid JSON; attempting repair")
        structure = _repair_json_with_llm(response, schema_hint)
    return {"chapters": structure.get("chapters", [])}


def extract_document_structure(ctx: UserContext, document_identifier: str) -> dict:
    selected = docs.resolve_selection(ctx, [document_identifier])
    if not selected:
        raise MindMapError("Document not found")
    document = selected[0]

    text = _document_text(ctx, document)[:MAX_STRUCTURE_CHARS]
    key = (ctx.user_id, document["id"], text)
    try:
        result = _structure_for(key)
    except json.JSONDecodeError as error:
        logger.error("Failed to parse structure JSON: %s", error)
        raise MindMapError("Could not read this document's structure. Try Full Document mode.")

    return {"filename": document["original_name"], "chapters": result["chapters"]}


def _filter_text_by_section(text: str, section_name: str) -> str:
    """Take the span from a section heading to the next plausible heading."""
    if not section_name:
        return text
    lowered, target = text.lower(), section_name.lower()
    start = lowered.find(target)
    if start == -1:
        return text
    window_start = max(0, start - 200)
    window_end = min(len(text), start + 8000)
    return text[window_start:window_end]


# --- tree normalisation (behaviour preserved) -------------------------------

def _normalize_description(value: str) -> str:
    cleaned = " ".join((value or "").split())
    if not cleaned:
        return (
            "Summarizes a key idea from the uploaded material. "
            "Highlights why the concept matters in context."
        )
    if len(cleaned) > 220:
        cleaned = cleaned[:217].rstrip(" ,;:") + "..."
    return cleaned


def _normalize_bullet_points(values) -> list[str]:
    if not isinstance(values, list):
        return []
    bullets = []
    for value in values:
        cleaned = " ".join(str(value or "").split())
        if not cleaned:
            continue
        if len(cleaned) > 60:
            cleaned = cleaned[:57].rstrip(" ,;:") + "..."
        bullets.append(cleaned)
        if len(bullets) == 4:
            break
    return bullets


def _sanitize_mindmap_tree(node: dict, depth: int = 0) -> dict:
    if not isinstance(node, dict):
        return {
            "title": "Untitled Topic",
            "description": _normalize_description(""),
            "bullet_points": [],
            "children": [],
        }

    title = " ".join(str(node.get("title", "Untitled Topic")).split())[:60].strip()
    child_limits = {0: 8, 1: 5, 2: 4}
    raw_children = node.get("children", [])
    if not isinstance(raw_children, list):
        raw_children = []

    children = (
        []
        if depth >= 3
        else [
            _sanitize_mindmap_tree(child, depth + 1)
            for child in raw_children[: child_limits.get(depth, 0)]
        ]
    )
    return {
        "title": title or "Untitled Topic",
        "description": _normalize_description(str(node.get("description", ""))),
        "bullet_points": _normalize_bullet_points(node.get("bullet_points", [])),
        "children": children,
    }


def _truncate_source_text(text: str, mode: str) -> str:
    limits = {"chapter": 5200, "topic": 3600}
    return text[: limits.get(mode, 6500)]


# --- persistence ------------------------------------------------------------

def _row_to_summary(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "source": row["source_label"],
        "created_at": row["created_at"],
    }


def _row_to_full(row) -> dict:
    payload = _row_to_summary(row)
    payload["mindmap"] = json.loads(row["tree_json"])
    return payload


def list_mindmaps(ctx: UserContext) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM mind_maps WHERE user_id = ? ORDER BY created_at DESC",
            (ctx.user_id,),
        ).fetchall()
    return [_row_to_summary(r) for r in rows]


def get_mindmap(ctx: UserContext, mindmap_id: str) -> Optional[dict]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM mind_maps WHERE id = ? AND user_id = ? LIMIT 1",
            (mindmap_id, ctx.user_id),
        ).fetchone()
    return _row_to_full(row) if row else None


def rename_mindmap(ctx: UserContext, mindmap_id: str, title: str) -> Optional[dict]:
    clean = " ".join((title or "").split())[:120]
    if not clean:
        raise MindMapError("Title cannot be empty")
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE mind_maps SET title = ? WHERE id = ? AND user_id = ?",
            (clean, mindmap_id, ctx.user_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            return None
    return get_mindmap(ctx, mindmap_id)


def delete_mindmap(ctx: UserContext, mindmap_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM mind_maps WHERE id = ? AND user_id = ?",
            (mindmap_id, ctx.user_id),
        )
        conn.commit()
        return cur.rowcount > 0


def _save(ctx: UserContext, payload: dict, mode: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mind_maps
                (id, user_id, title, source_label, mode, tree_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["id"],
                ctx.user_id,
                payload["title"],
                payload["source"],
                mode,
                json.dumps(payload["mindmap"], ensure_ascii=False),
                payload["created_at"],
            ),
        )
        conn.commit()


# --- generation -------------------------------------------------------------

def generate_mindmap(
    ctx: UserContext,
    source_type: str,
    source_identifiers: Optional[list[str]] = None,
    text_content: Optional[str] = None,
    mode: str = "full",
    selected_chapter: Optional[str] = None,
    selected_topic: Optional[str] = None,
) -> dict:
    started = time.perf_counter()

    text, source_label = get_text_from_sources(
        ctx, source_type, source_identifiers, text_content
    )
    if not text.strip():
        raise MindMapError("No text content to generate a mind map from")

    if mode in ("chapter", "topic") and source_type == "uploaded_pdf":
        target = selected_chapter if mode == "chapter" else selected_topic
        if target:
            text = _filter_text_by_section(text, target)

    prompt = build_mindmap_generation_prompt(
        _truncate_source_text(text, mode), mode, selected_chapter, selected_topic
    )
    schema_hint = (
        '{"title":"...","description":"...","bullet_points":["..."],'
        '"children":[{"title":"...","description":"...",'
        '"bullet_points":["..."],"children":[]}]}'
    )

    try:
        response = generate_text(
            prompt, temperature=0.2, max_tokens=8192, response_mime_type="application/json"
        )
        try:
            parsed = _parse_json_response(response)
        except json.JSONDecodeError:
            logger.warning("Mind map response was not valid JSON; attempting repair")
            parsed = _repair_json_with_llm(response, schema_hint)
        tree = _sanitize_mindmap_tree(parsed)
    except json.JSONDecodeError:
        raise MindMapError("The model returned an unreadable mind map. Please try again.")
    except MindMapError:
        raise
    except Exception:
        logger.exception("Mind map generation failed for %s", ctx)
        raise MindMapError("Mind map generation is unavailable right now. Please try again.")

    payload = {
        "id": uuid.uuid4().hex[:12],
        "title": tree.get("title") or "Untitled Mind Map",
        "source": source_label,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mindmap": tree,
    }
    _save(ctx, payload, mode)

    logger.info(
        "Mind map generated in %.2fs for user %s", time.perf_counter() - started, ctx.user_id
    )
    return payload
