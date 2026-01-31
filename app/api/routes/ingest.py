from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi import BackgroundTasks
from app.core.config import settings
import os, shutil
from app.services.ingestion_service import ingest_pdf
from urllib.parse import unquote

router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])
UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

INGESTION_STATUS = {
    "status": "idle",      # idle | processing | completed | failed
    "pages": 0,
    "chunks": 0,
    "error": None,
}

def ingest_background(file: UploadFile):
    try:
        INGESTION_STATUS["status"] = "processing"
        INGESTION_STATUS["error"] = None

        result = ingest_pdf(file)

        INGESTION_STATUS["status"] = "completed"
        INGESTION_STATUS["pages"] = result.get("pages",0)
        INGESTION_STATUS["chunks"] = result.get("chunks", 0)

    except Exception as e:
        INGESTION_STATUS["status"] = "failed"
        INGESTION_STATUS["error"] = str(e)


@router.post("/")
async def ingest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
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
    uploaded_file = file.file
    uploaded_file.seek(0, 2)  # move cursor to end
    file_size = uploaded_file.tell()
    uploaded_file.seek(0)     # reset cursor

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 50MB"
        )

    try:
        # Run ingestion in background
        background_tasks.add_task(ingest_background, file)

        # Respond immediately (no timeout)
        return {
            "status": "accepted",
            "message": "PDF upload received. Processing started in background.",
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting PDF: {str(e)}")
    
@router.get("/status")
async def ingest_status():
    return INGESTION_STATUS

@router.delete("/delete/{filename}")
async def delete_pdf(filename: str):
    # 🔑 Decode URL-encoded filename
    decoded_filename = unquote(filename)

    print("Decoded filename:", decoded_filename)

    uploads_dir = os.path.abspath("app/data/uploads")
    pdf_path = os.path.join(uploads_dir, decoded_filename)

    print("Resolved path:", pdf_path)
    print("Exists?", os.path.exists(pdf_path))

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    os.remove(pdf_path)

    from app.services.ingestion_service import rebuild_vectorstore_from_uploads
    rebuild_vectorstore_from_uploads()

    return {
        "status": "deleted",
        "filename": filename
    }


@router.delete("/reset")
async def reset_all_pdfs():
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    from app.core.config import settings
    if os.path.exists(settings.VECTOR_DB_PATH):
        shutil.rmtree(settings.VECTOR_DB_PATH)

    # Reset status safely
    INGESTION_STATUS.update({
        "status": "idle",
        "pages": 0,
        "chunks": 0,
        "error": None,
    })

    return {
        "status": "reset",
        "message": "All PDFs and embeddings deleted"
    }

