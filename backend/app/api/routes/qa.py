"""Question answering.

Two endpoints over one pipeline:
  POST /qa/ask        — JSON, unchanged response shape (plus richer citations)
  POST /qa/ask/stream — Server-Sent Events carrying the real pipeline stages

The streaming endpoint exists so the UI can show what the backend is actually
doing. Every event it emits corresponds to a boundary the pipeline crossed; no
stage is advanced on a timer.
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.routes.auth import get_user_context
from app.api.schemas.qa import QARequest, QAResponse
from app.core.config import settings
from app.core.context import UserContext
from app.services import document_service as docs
from app.services.chat_history_service import create_or_append_chat_turn
from app.services.rag_service import run_rag_stages

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/qa", tags=["qa"])


def _prepare(request: QARequest, ctx: UserContext) -> tuple[list[str], int, Optional[list]]:
    """Validate the request and resolve its document selection to owned ids."""
    if request.chat_history and len(request.chat_history) > settings.MAX_CHAT_HISTORY:
        request.chat_history = request.chat_history[-settings.MAX_CHAT_HISTORY:]

    selected = docs.resolve_selection(ctx, request.selected_identifiers())
    document_ids = [d["id"] for d in selected]

    ready_total = sum(1 for d in docs.list_documents(ctx) if d["status"] == "ready")
    if ready_total == 0:
        raise HTTPException(
            status_code=400,
            detail="No documents are ready yet. Upload and index a document first.",
        )

    history = None
    if request.chat_history:
        history = [{"role": m.role, "content": m.content} for m in request.chat_history]

    return document_ids, (len(document_ids) or ready_total), history


@router.post("/ask", response_model=QAResponse)
async def ask_question(
    request: QARequest,
    ctx: UserContext = Depends(get_user_context),
):
    document_ids, doc_count, history = _prepare(request, ctx)

    def _run() -> dict:
        final, failure = None, None
        for event in run_rag_stages(
            ctx,
            request.question.strip(),
            syllabus_context=request.syllabus_context or "",
            marks=request.marks or 3,
            chat_history=history,
            document_ids=document_ids,
            document_count=doc_count,
        ):
            if event.get("stage") == "completed":
                final = event["result"]
            elif event.get("stage") == "failed":
                failure = event
        return {"final": final, "failure": failure}

    outcome = await asyncio.to_thread(_run)
    if outcome["failure"]:
        raise HTTPException(status_code=400, detail=outcome["failure"]["error"])
    result = outcome["final"]
    if result is None:
        raise HTTPException(status_code=500, detail="Answer generation produced no result")

    try:
        saved = await asyncio.to_thread(
            create_or_append_chat_turn,
            user_id=ctx.user_id,
            question=request.question.strip(),
            answer=result.get("answer", ""),
            marks=request.marks or 3,
            syllabus_context=request.syllabus_context,
            document_names=request.selected_identifiers(),
            sources=result.get("sources", []),
            session_id=request.session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception:
        logger.exception("Failed to persist chat history for %s", ctx)
        raise HTTPException(
            status_code=500, detail="Answer generated, but chat history could not be saved."
        )

    return QAResponse(
        answer=result.get("answer", ""),
        pages=result.get("pages", []),
        sources=result.get("sources", []),
        session_id=saved["id"],
    )


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("/ask/stream")
async def ask_question_stream(
    request: QARequest,
    ctx: UserContext = Depends(get_user_context),
):
    document_ids, doc_count, history = _prepare(request, ctx)
    question = request.question.strip()

    async def event_stream():
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def produce():
            try:
                for event in run_rag_stages(
                    ctx,
                    question,
                    syllabus_context=request.syllabus_context or "",
                    marks=request.marks or 3,
                    chat_history=history,
                    document_ids=document_ids,
                    document_count=doc_count,
                ):
                    loop.call_soon_threadsafe(queue.put_nowait, event)
            except Exception:
                logger.exception("Streaming pipeline crashed for %s", ctx)
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {"stage": "failed", "error": "Something went wrong. Please try again."},
                )
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        task = asyncio.create_task(asyncio.to_thread(produce))
        final_result = None

        try:
            while True:
                event = await queue.get()
                if event is None:
                    break

                if event.get("stage") == "completed":
                    final_result = event["result"]
                    # Persist before telling the client it is done, so a reload
                    # never loses an answer the user has already seen.
                    try:
                        saved = await asyncio.to_thread(
                            create_or_append_chat_turn,
                            user_id=ctx.user_id,
                            question=question,
                            answer=final_result.get("answer", ""),
                            marks=request.marks or 3,
                            syllabus_context=request.syllabus_context,
                            document_names=request.selected_identifiers(),
                            sources=final_result.get("sources", []),
                            session_id=request.session_id,
                        )
                        event["result"]["session_id"] = saved["id"]
                    except Exception:
                        logger.exception("Could not persist streamed turn for %s", ctx)
                        event["result"]["session_id"] = request.session_id
                        event["result"]["persisted"] = False

                yield _sse(event)
        except asyncio.CancelledError:
            logger.info("Client cancelled the answer stream for %s", ctx)
            raise
        finally:
            task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # ask nginx-style proxies not to buffer
        },
    )
