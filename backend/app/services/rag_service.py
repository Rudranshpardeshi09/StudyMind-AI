import logging
import os
import re
import time
from typing import Iterator, Optional

from app.core.config import settings
from app.core.context import UserContext
from app.rag.prompts import RAG_PROMPT
from app.services import document_service as docs
from app.services.gemini_llm import generate_text
from app.vectorstore import faiss_store

logger = logging.getLogger(__name__)

FOLLOW_UP_REFERENCE_PATTERNS = (
    r"\bcontinue\b",
    r"\bmore\b",
    r"\bthis\b",
    r"\bit\b",
    r"\bthat\b",
    r"\bthe above\b",
    r"\bthose\b",
    r"\bthese\b",
)

STANDALONE_QUESTION_PREFIXES = (
    "what ", "who ", "when ", "where ", "why ", "how ",
    "define ", "describe ", "explain ", "list ", "compare ", "differentiate ",
)


def _normalize_text(value: str) -> str:
    return " ".join((value or "").split()).strip()


def extract_keywords(text: str) -> set:
    words = set()
    for word in text.lower().split():
        cleaned = "".join(c for c in word if c.isalpha())
        if len(cleaned) >= 3:
            words.add(cleaned)
    return words


def _looks_like_context_dependent_followup(question: str) -> bool:
    normalized = _normalize_text(question).lower()
    if not normalized:
        return False
    keyword_count = len(extract_keywords(normalized))
    if len(normalized) <= 16:
        return True
    if any(re.search(p, normalized) for p in FOLLOW_UP_REFERENCE_PATTERNS):
        return True
    if normalized.startswith(STANDALONE_QUESTION_PREFIXES) and keyword_count >= 3:
        return False
    return keyword_count <= 2


def _recent_user_topic(chat_history: Optional[list]) -> str:
    if not chat_history:
        return ""
    for msg in reversed(chat_history):
        if msg.get("role") != "user":
            continue
        content = _normalize_text(msg.get("content", ""))
        if len(content) < 12 or _looks_like_context_dependent_followup(content):
            continue
        return content
    for msg in reversed(chat_history):
        if msg.get("role") == "user":
            return _normalize_text(msg.get("content", ""))
    return ""


def build_search_query(
    question: str, syllabus_context: str = "", chat_history: Optional[list] = None
) -> str:
    normalized_question = _normalize_text(question)
    parts = []
    if syllabus_context and len(syllabus_context.strip()) > 20:
        parts.append(syllabus_context.strip()[:100])
    if _looks_like_context_dependent_followup(normalized_question):
        prior = _recent_user_topic(chat_history)
        if prior:
            parts.append(prior)
    parts.append(normalized_question)
    return " ".join(p for p in parts if p).strip()


def lexical_overlap(doc_content: str, question_keywords: set) -> float:
    if not question_keywords:
        return 0.0
    return len(question_keywords & extract_keywords(doc_content)) / len(question_keywords)


def _semantic_score(distance: float) -> float:
    try:
        similarity = 1.0 - float(distance) / 2.0
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, similarity))


def blend_and_rank(scored_docs: list, question: str) -> list:
    if not scored_docs:
        return []
    keywords = extract_keywords(question)
    weight = max(0.0, min(1.0, settings.LEXICAL_WEIGHT))

    ranked = []
    for doc, distance in scored_docs:
        semantic = _semantic_score(distance)
        lexical = lexical_overlap(doc.page_content, keywords)
        combined = (1.0 - weight) * semantic + weight * lexical
        ranked.append((doc, combined, semantic, lexical))

    ranked.sort(key=lambda item: item[1], reverse=True)
    if logger.isEnabledFor(logging.DEBUG):
        for doc, combined, semantic, lexical in ranked[:5]:
            logger.debug(
                "rank combined=%.3f semantic=%.3f lexical=%.3f page=%s",
                combined, semantic, lexical, doc.metadata.get("page"),
            )
    return [doc for doc, _, _, _ in ranked]


def _deduplicate(docs_list: list) -> list:
    seen, unique = set(), []
    for doc in docs_list:
        key = doc.metadata.get("chunk_id") or (
            doc.metadata.get("source"), doc.metadata.get("page"), doc.page_content[:200]
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(doc)
    return unique


def _context_budget(marks: int) -> int:
    base = settings.MAX_CONTEXT_CHARS
    if marks <= 3:
        return int(base * 0.55)
    if marks <= 5:
        return int(base * 0.8)
    return base


def _build_context(top_docs: list, budget: int) -> str:
    parts, used = [], 0
    per_doc = max(400, budget // max(1, len(top_docs)))
    for i, doc in enumerate(top_docs, 1):
        remaining = budget - used
        if remaining <= 0:
            break
        content = " ".join(doc.page_content.split())[: min(per_doc, remaining)]
        part = "[Source {} | File: {} | Page: {}]\n{}".format(
            i, doc.metadata.get("source", "Unknown"), doc.metadata.get("page", "N/A"), content
        )
        parts.append(part)
        used += len(part) + 8
    return "\n\n---\n\n".join(parts)


def _page_number(doc) -> int:
    page = doc.metadata.get("page", 1)
    if isinstance(page, int):
        return page
    if isinstance(page, str) and page.isdigit():
        return int(page)
    return 1


def _build_sources(top_docs: list) -> list[dict]:
    sources = []
    for doc in top_docs:
        meta = doc.metadata
        sources.append(
            {
                "document_id": meta.get("document_id"),
                "document_name": os.path.basename(str(meta.get("source", "")))
                or "Unknown document",
                "page": _page_number(doc),
                "chunk_id": meta.get("chunk_id"),
                "text": doc.page_content[:280],
            }
        )
    return sources


def _retrieve(index, query: str, k: int, document_ids: Optional[list[str]]):
    fetch_k = max(k * 3, settings.RETRIEVER_FETCH_K)
    search_filter = None
    if document_ids:
        allowed = set(document_ids)
        search_filter = lambda meta: meta.get("document_id") in allowed  # noqa: E731

    try:
        return index.similarity_search_with_score(query, k=fetch_k, filter=search_filter)
    except TypeError:
        results = index.similarity_search_with_score(query, k=fetch_k)
        if not document_ids:
            return results
        allowed = set(document_ids)
        return [(d, s) for d, s in results if d.metadata.get("document_id") in allowed]


def run_rag_stages(
    ctx: UserContext,
    question: str,
    *,
    syllabus_context: str = "",
    marks: int = 3,
    chat_history: Optional[list] = None,
    document_ids: Optional[list[str]] = None,
    document_count: int = 0,
) -> Iterator[dict]:
    started = time.perf_counter()

    yield {"stage": "preparing"}
    search_query = build_search_query(question, syllabus_context, chat_history)
    desired_k = 4 if marks <= 3 else 5 if marks <= 5 else settings.TOP_K

    yield {
        "stage": "retrieving",
        "document_count": document_count,
        "scope": "selected" if document_ids else "all",
    }
    try:
        index = faiss_store.load_index(ctx.storage)
    except faiss_store.IncompatibleIndexError:
        flagged = docs.mark_reindex_required(ctx)
        logger.warning("Flagged %s documents for re-indexing for user %s", flagged, ctx.user_id)
        yield {
            "stage": "failed",
            "error": "Your documents were indexed with a different embedding model and need "
                     "re-indexing. Retry them from your document list (or re-upload them), "
                     "then ask again.",
            "code": "index_incompatible",
        }
        return
    if index is None:
        yield {
            "stage": "failed",
            "error": "No indexed documents yet. Upload a document first.",
            "code": "no_index",
        }
        return

    retrieval_started = time.perf_counter()
    try:
        scored = _retrieve(index, search_query, desired_k, document_ids)
    except Exception:
        logger.exception("Retrieval failed for user %s", ctx.user_id)
        yield {
            "stage": "failed",
            "error": "The search service is unavailable right now. Please try again.",
            "code": "retrieval_error",
        }
        return
    logger.info(
        "Retrieved %s candidates in %.2fs for user %s",
        len(scored), time.perf_counter() - retrieval_started, ctx.user_id,
    )

    if not scored:
        yield {
            "stage": "failed",
            "error": "I could not find anything relevant in the selected material.",
            "code": "no_match",
        }
        return

    yield {"stage": "analyzing", "candidate_count": len(scored)}
    ranked = _deduplicate(blend_and_rank(scored, f"{search_query} {question}".strip()))
    top_docs = ranked[:desired_k]
    if not top_docs:
        yield {"stage": "failed", "error": "No usable passages found.", "code": "no_match"}
        return

    passage_pages = sorted({_page_number(d) for d in top_docs})
    yield {
        "stage": "generating",
        "passage_count": len(top_docs),
        "pages": passage_pages,
        "documents": sorted({
            os.path.basename(str(d.metadata.get("source", ""))) for d in top_docs
        } - {""}),
    }

    context = _build_context(top_docs, _context_budget(marks))

    formatted_history = "No previous conversation."
    if chat_history:
        recent = chat_history[-settings.MAX_CHAT_HISTORY:]
        lines = []
        for msg in recent:
            role = "Student" if msg.get("role") == "user" else "Tutor"
            content = msg.get("content", "")
            lines.append(f"{role}: {content[:300]}{'...' if len(content) > 300 else ''}")
        formatted_history = "\n".join(lines)

    prompt = RAG_PROMPT.format(
        syllabus_context=(syllabus_context or "").strip() or "No syllabus provided.",
        marks=marks,
        context=context,
        question=question,
        chat_history=formatted_history,
    )

    try:
        logger.info("Generating answer: %s context chars, marks=%s", len(context), marks)
        answer = generate_text(prompt)
        if not answer:
            raise ValueError("Empty response from the model")
    except Exception:
        logger.exception("Answer generation failed for user %s", ctx.user_id)
        yield {
            "stage": "failed",
            "error": "The answer service is unavailable right now. Please try again.",
            "code": "llm_error",
        }
        return

    yield {"stage": "validating"}
    sources = _build_sources(top_docs)

    logger.info("RAG completed in %.2fs", time.perf_counter() - started)
    yield {
        "stage": "completed",
        "result": {
            "answer": answer,
            "pages": [str(p) for p in passage_pages],
            "sources": sources,
            "error": False,
        },
    }
