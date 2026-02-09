from fastapi import APIRouter, HTTPException
from app.api.schemas.qa import QARequest, QAResponse
from app.services.rag_service import run_rag
from app.vectorstore.faiss_store import load_vectorstore
import os
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/qa", tags=["qa"])

@router.post("/ask", response_model=QAResponse)
async def ask_question(request: QARequest):
    """Ask a question about uploaded PDFs"""
    try:
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        # INPUT VALIDATION
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=422,
                detail="Question cannot be empty"
            )
        
        if len(request.question) > 1000:
            raise HTTPException(
                status_code=422,
                detail="Question is too long (max 1000 characters)"
            )
        
        if request.marks is not None and (request.marks < 0 or request.marks > 100):
            raise HTTPException(
                status_code=422,
                detail="Marks must be between 0 and 100"
            )
        
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        # CHECK VECTORSTORE
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        if not os.path.exists(settings.VECTOR_DB_PATH):
            logger.warning("Vectorstore not found at {}".format(settings.VECTOR_DB_PATH))
            raise HTTPException(
                status_code=400, 
                detail="No documents uploaded yet. Please upload PDFs first."
            )
        
        # Load vectorstore
        try:
            vectorstore = load_vectorstore()
        except Exception as e:
            logger.error(f"Failed to load vectorstore: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to load vectorstore. Please re-upload documents."
            )
        
        if vectorstore is None:
            raise HTTPException(
                status_code=400, 
                detail="Vectorstore is empty. Please upload PDFs first."
            )
        
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        # RUN RAG PIPELINE
        # ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
        # Convert chat history to list of dicts for the RAG service
        chat_history = None
        if request.chat_history:
            chat_history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        
        result = run_rag(
            question=request.question.strip(),
            vectorstore=vectorstore,
            syllabus_context=request.syllabus_context or "",
            marks=request.marks or 3,
            chat_history=chat_history
        )
        
        # Check if there was an error in the result
        if result.get("error"):
            logger.warning(f"RAG pipeline error: {result.get('answer')}")
            raise HTTPException(
                status_code=400, 
                detail=result.get("answer", "Error generating response")
            )
        
        return QAResponse(
            answer=result.get("answer", ""),
            pages=result.get("pages", []),
            sources=result.get("sources", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in ask_question: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error. Please try again later."
        )
