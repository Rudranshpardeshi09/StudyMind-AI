import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth import get_user_context
from app.api.schemas.mindmap import (
    DocumentStructure,
    MindMapGenerateRequest,
    MindMapHistoryItem,
    MindMapRenameRequest,
    MindMapResponse,
)
from app.core.context import UserContext
from app.services.mindmap_service import (
    MindMapError,
    delete_mindmap,
    extract_document_structure,
    generate_mindmap,
    get_mindmap,
    list_mindmaps,
    rename_mindmap,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mindmap", tags=["Mind Map"])


@router.post("/generate", response_model=MindMapResponse)
async def generate_mindmap_endpoint(
    request: MindMapGenerateRequest,
    ctx: UserContext = Depends(get_user_context),
):
    try:
        return await asyncio.to_thread(
            generate_mindmap,
            ctx,
            source_type=request.source_type.value,
            source_identifiers=request.selected_identifiers(),
            text_content=request.text_content,
            mode=request.mode.value,
            selected_chapter=request.selected_chapter,
            selected_topic=request.selected_topic,
        )
    except MindMapError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Mind map generation failed for %s", ctx)
        raise HTTPException(
            status_code=500, detail="Failed to generate mind map. Please try again."
        )


@router.get("/history", response_model=list[MindMapHistoryItem])
async def get_mindmap_history(ctx: UserContext = Depends(get_user_context)):
    try:
        return await asyncio.to_thread(list_mindmaps, ctx)
    except Exception:
        logger.exception("Could not list mind maps for %s", ctx)
        raise HTTPException(status_code=500, detail="Failed to load history")


@router.get("/structure/{document_identifier}", response_model=DocumentStructure)
async def get_document_structure(
    document_identifier: str,
    ctx: UserContext = Depends(get_user_context),
):
    try:
        return await asyncio.to_thread(extract_document_structure, ctx, document_identifier)
    except MindMapError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Structure extraction failed for %s", ctx)
        raise HTTPException(
            status_code=500, detail="Failed to extract document structure. Please try again."
        )


@router.get("/{mindmap_id}", response_model=MindMapResponse)
async def get_mindmap_endpoint(
    mindmap_id: str,
    ctx: UserContext = Depends(get_user_context),
):
    result = await asyncio.to_thread(get_mindmap, ctx, mindmap_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Mind map not found")
    return result


@router.patch("/{mindmap_id}", response_model=MindMapResponse)
async def rename_mindmap_endpoint(
    mindmap_id: str,
    request: MindMapRenameRequest,
    ctx: UserContext = Depends(get_user_context),
):
    try:
        result = await asyncio.to_thread(rename_mindmap, ctx, mindmap_id, request.title)
    except MindMapError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if result is None:
        raise HTTPException(status_code=404, detail="Mind map not found")
    return result


@router.delete("/{mindmap_id}")
async def delete_mindmap_endpoint(
    mindmap_id: str,
    ctx: UserContext = Depends(get_user_context),
):
    if not await asyncio.to_thread(delete_mindmap, ctx, mindmap_id):
        raise HTTPException(status_code=404, detail="Mind map not found")
    return {"status": "deleted", "id": mindmap_id}
