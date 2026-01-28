from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ingestion_service import ingest_pdf

router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])

@router.post("/")
async def ingest(file: UploadFile = File(...)):
    """
    Upload and index a PDF document.
    
    Process:
    1. Saves PDF temporarily
    2. Extracts text with page awareness
    3. Chunks intelligently
    4. Stores embeddings in FAISS vector store
    
    Returns:
    {
        "status": "success",
        "message": "PDF ingested successfully",
        "filename": "filename.pdf",
        "pages": <number of pages>
    }
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate file type and size
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Check file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    file_size = len(await file.read())
    await file.seek(0)  # Reset file pointer
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB")

    try:
        result = ingest_pdf(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting PDF: {str(e)}")
