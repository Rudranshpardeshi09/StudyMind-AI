# this file handles the question-answering API endpoint
from fastapi import APIRouter, HTTPException
from app.api.schemas.qa import QARequest, QAResponse
from app.services.rag_service import run_rag
from app.vectorstore.faiss_store import load_vectorstore
import os
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
# creating a router for all QA related endpoints
router = APIRouter(prefix="/qa", tags=["qa"])

# this endpoint receives a question and returns an AI-generated answer from the PDFs
@router.post("/ask", response_model=QAResponse)
async def ask_question(request: QARequest):
    try:
        # make sure the question is not empty
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=422,
                detail="Question cannot be empty"
            )
        
        # prevent super long questions that might break things
        if len(request.question) > 1000:
            raise HTTPException(
                status_code=422,
                detail="Question is too long (max 1000 characters)"
            )
        
        # make sure marks value is reasonable
        if request.marks is not None and (request.marks < 0 or request.marks > 100):
            raise HTTPException(
                status_code=422,
                detail="Marks must be between 0 and 100"
            )
        
        # check if we even have any PDFs uploaded and processed
        if not os.path.exists(settings.VECTOR_DB_PATH):
            logger.warning("Vectorstore not found at {}".format(settings.VECTOR_DB_PATH))
            raise HTTPException(
                status_code=400, 
                detail="No documents uploaded yet. Please upload PDFs first."
            )
        
        # try to load our search database
        try:
            vectorstore = load_vectorstore()
        except Exception as e:
            logger.error(f"Failed to load vectorstore: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to load vectorstore. Please re-upload documents."
            )
        
        # if the database is empty, ask the user to upload PDFs first
        if vectorstore is None:
            raise HTTPException(
                status_code=400, 
                detail="Vectorstore is empty. Please upload PDFs first."
            )
        
        # convert chat history from the request into a simple list format
        chat_history = None
        if request.chat_history:
            chat_history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        
        # run the RAG pipeline to get the answer
        result = run_rag(
            question=request.question.strip(),
            vectorstore=vectorstore,
            syllabus_context=request.syllabus_context or "",
            marks=request.marks or 3,
            chat_history=chat_history
        )
        
        # if the RAG pipeline returned an error, pass it to the frontend
        if result.get("error"):
            logger.warning(f"RAG pipeline error: {result.get('answer')}")
            raise HTTPException(
                status_code=400, 
                detail=result.get("answer", "Error generating response")
            )
        
        # send back the answer along with page numbers and source references
        return QAResponse(
            answer=result.get("answer", ""),
            pages=result.get("pages", []),
            sources=result.get("sources", [])
        )
    except HTTPException:
        # re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # catch any unexpected errors and return a clean error message
        logger.error(f"Unexpected error in ask_question: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error. Please try again later."
        )
