"""Document upload and lifecycle endpoints.

All routes resolve documents by id scoped to the caller. Processing runs in a
bounded thread pool; status lives on the document row rather than in process
memory, so it survives a restart and is correct under more than one worker.
"""

import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.core.config import settings
from app.core.context import UserContext
from app.core.storage import UnsafePathError
from app.api.routes.auth import get_user_context
from app.services import document_service as docs
from app.services.ingestion_service import (
    IngestionError,
    hash_file,
    ingest_document,
    remove_document,
    reset_user_documents,
)
from app.utils.file_utils import sanitize_filename, save_upload_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])

# Bounded so a burst of uploads cannot exhaust memory. Per-user index locks live
# in the vector store, so one user's ingest no longer blocks another's.
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ingest_")


def _process(ctx: UserContext, document_id: str) -> None:
    try:
        ingest_document(ctx, document_id)
    except IngestionError as exc:
        logger.info("Ingestion rejected document %s: %s", document_id, exc)
    except Exception:
        logger.exception("Unhandled ingestion failure for %s", document_id)


def _schedule(ctx: UserContext, document_id: str) -> None:
    _executor.submit(_process, ctx, document_id)


@router.post("/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ctx: UserContext = Depends(get_user_context),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    safe_name = sanitize_filename(file.filename)  # validates extension too
    if file.content_type and file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if docs.count_documents(ctx) >= settings.MAX_DOCUMENTS_PER_USER:
        raise HTTPException(
            status_code=409,
            detail=f"Document limit reached ({settings.MAX_DOCUMENTS_PER_USER}). Delete one first.",
        )

    try:
        destination = ctx.storage.upload_path(safe_name)
    except UnsafePathError:
        raise HTTPException(status_code=400, detail="Invalid file name")

    try:
        size = save_upload_file(file, str(destination))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to store upload for %s", ctx)
        raise HTTPException(status_code=500, detail="Failed to save file")

    content_hash = hash_file(destination)

    # Identical content already indexed for this user: link, do not re-embed.
    duplicate = docs.find_by_hash(ctx, content_hash)
    if duplicate and duplicate["stored_name"] != safe_name:
        try:
            destination.unlink()
        except OSError:
            pass
        return {
            "status": "duplicate",
            "document": duplicate,
            "message": f"Already indexed as {duplicate['original_name']}.",
        }

    record = docs.create_document(
        ctx,
        original_name=file.filename.strip()[:255],
        stored_name=safe_name,
        byte_size=size,
        content_hash=content_hash,
    )

    background_tasks.add_task(_schedule, ctx, record["id"])
    return {"status": "accepted", "document": record}


@router.get("/documents")
async def list_documents(ctx: UserContext = Depends(get_user_context)):
    return {"documents": docs.list_documents(ctx)}


@router.get("/status")
async def ingest_status(
    filename: str | None = None,
    ctx: UserContext = Depends(get_user_context),
):
    """Legacy status shape, keyed by stored name.

    Retained so an older frontend keeps working; new clients should use
    /ingest/documents, which returns ids.
    """
    records = docs.list_documents(ctx)
    payload = {
        r["stored_name"]: {
            "status": r["status"],
            "pages": r["pages"],
            "chunks": r["chunk_count"],
            "error": r["error"],
            "document_id": r["id"],
        }
        for r in records
    }
    if filename:
        try:
            key = sanitize_filename(filename)
        except HTTPException:
            return {"status": "not_found"}
        return payload.get(key, {"status": "not_found"})
    return payload


@router.post("/{document_id}/retry")
async def retry_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    ctx: UserContext = Depends(get_user_context),
):
    record = docs.get_document(ctx, document_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if record["status"] == "ready":
        return {"status": "ready", "document": record}

    docs.set_status(document_id, "queued")
    background_tasks.add_task(_schedule, ctx, document_id)
    return {"status": "accepted", "document": docs.get_document(ctx, document_id)}


@router.delete("/reset")
async def reset_documents(ctx: UserContext = Depends(get_user_context)):
    removed = reset_user_documents(ctx)
    return {"status": "reset", "removed": removed}


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    ctx: UserContext = Depends(get_user_context),
):
    if not remove_document(ctx, document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "id": document_id}


@router.delete("/delete/{filename}")
async def delete_document_by_name(
    filename: str,
    ctx: UserContext = Depends(get_user_context),
):
    """Legacy delete-by-name, kept so an older frontend keeps working.

    Resolution is still scoped to the caller, so this cannot reach another
    user's file the way the pre-tenancy version could.
    """
    from urllib.parse import unquote

    try:
        safe_name = sanitize_filename(unquote(filename))
    except HTTPException:
        raise HTTPException(status_code=404, detail="Document not found")

    record = docs.get_document_by_stored_name(ctx, safe_name)
    if record is None or not remove_document(ctx, record["id"]):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "filename": safe_name, "id": record["id"]}
