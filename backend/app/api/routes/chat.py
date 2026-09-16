import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth import get_current_user
from app.api.schemas.auth import UserPublic
from app.api.schemas.chat import ChatSessionDetail, ChatSessionSummary
from app.services.chat_history_service import (
    delete_chat_session,
    get_chat_session,
    list_chat_sessions,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat-sessions", tags=["chat-history"])


@router.get("/", response_model=list[ChatSessionSummary])
async def get_chat_sessions(user: UserPublic = Depends(get_current_user)):
    try:
        return await asyncio.to_thread(list_chat_sessions, int(user.sub))
    except Exception as exc:
        logger.error("Failed to list chat sessions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load chat history")


@router.get("/{session_id}", response_model=ChatSessionDetail)
async def get_chat_session_by_id(
    session_id: str,
    user: UserPublic = Depends(get_current_user),
):
    try:
        result = await asyncio.to_thread(get_chat_session, int(user.sub), session_id)
    except Exception as exc:
        logger.error("Failed to load chat session %s: %s", session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to load chat session")

    if result is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return result


@router.delete("/{session_id}")
async def delete_chat_session_by_id(
    session_id: str,
    user: UserPublic = Depends(get_current_user),
):
    try:
        deleted = await asyncio.to_thread(delete_chat_session, int(user.sub), session_id)
    except Exception as exc:
        logger.error("Failed to delete chat session %s: %s", session_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete chat session")

    if not deleted:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "deleted", "id": session_id}
