# from fastapi import APIRouter, UploadFile, File, HTTPException
# from fastapi import BackgroundTasks
# from app.core.config import settings
# import os, shutil
# from app.services.ingestion_service import ingest_pdf
# from urllib.parse import unquote

# router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])
# UPLOAD_DIR = "app/data/uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# INGESTION_STATUS = {}  # filename -> status


# def ingest_background(file_path: str, filename: str):
#     INGESTION_STATUS[filename] = {
#             "status": "processing",
#             "pages": 0,
#             "chunks": 0,
#             "error": None,
#         }    
#     try:

#         result = ingest_pdf(file_path)

#         INGESTION_STATUS[filename].update({
#             "status": "completed",
#             "pages": result["pages"],
#             "chunks": result["chunks"],
#         })

#     except Exception as e:
#         INGESTION_STATUS[filename].update({
#             "status": "failed",
#             "error": str(e),
#         })


# @router.post("/")
# async def ingest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
#     """
#     Upload and index a PDF document.
    
#     Process:
#     1. Saves PDF temporarily
#     2. Extracts text with page awareness
#     3. Chunks intelligently
#     4. Stores embeddings in FAISS vector store
    
#     Returns:
#     {
#         "status": "success",
#         "message": "PDF ingested successfully",
#         "filename": "filename.pdf",
#         "pages": <number of pages>
#     }
#     """
#     if not file:
#         raise HTTPException(status_code=400, detail="No file provided")

#     # Validate file type and size
#     if not file.filename.lower().endswith(".pdf"):
#         raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
#     # Check file size (max 50MB)
#     MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
#     uploaded_file = file.file
#     uploaded_file.seek(0, 2)  # move cursor to end
#     file_size = uploaded_file.tell()
#     uploaded_file.seek(0)     # reset cursor

#     if file_size > MAX_FILE_SIZE:
#         raise HTTPException(
#             status_code=413,
#             detail="File too large. Maximum size is 50MB"
#         )

#     try:
#         # Run ingestion in background
#         file_path = os.path.join(UPLOAD_DIR, file.filename)

#         with open(file_path, "wb") as f:
#             shutil.copyfileobj(file.file, f)

#         background_tasks.add_task(
#             ingest_background,
#             file_path,
#             file.filename
#         )


#         # Respond immediately (no timeout)
#         return {
#             "status": "accepted",
#             "message": "PDF upload received. Processing started in background.",
#             "filename": file.filename
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error ingesting PDF: {str(e)}")
    
# @router.get("/status")
# async def ingest_status(filename: str | None = None):
#     if filename:
#         return INGESTION_STATUS.get(filename, {"status": "not_found"})
#     return INGESTION_STATUS

# @router.delete("/delete/{filename}")
# async def delete_pdf(filename: str):
#     # 🔑 Decode URL-encoded filename
#     decoded_filename = unquote(filename)

#     print("Decoded filename:", decoded_filename)

#     uploads_dir = os.path.abspath("app/data/uploads")
#     pdf_path = os.path.join(uploads_dir, decoded_filename)

#     print("Resolved path:", pdf_path)
#     print("Exists?", os.path.exists(pdf_path))

#     if not os.path.exists(pdf_path):
#         raise HTTPException(status_code=404, detail="PDF not found")

#     os.remove(pdf_path)

#     from app.services.ingestion_service import rebuild_vectorstore_from_uploads
#     rebuild_vectorstore_from_uploads()

#     return {
#         "status": "deleted",
#         "filename": filename
#     }


# @router.delete("/reset")
# async def reset_all_pdfs():
#     if os.path.exists(UPLOAD_DIR):
#         shutil.rmtree(UPLOAD_DIR)
#         os.makedirs(UPLOAD_DIR, exist_ok=True)

#     from app.core.config import settings
#     if os.path.exists(settings.VECTOR_DB_PATH):
#         shutil.rmtree(settings.VECTOR_DB_PATH)

#     # Reset status safely
#     INGESTION_STATUS.update({
#         "status": "idle",
#         "pages": 0,
#         "chunks": 0,
#         "error": None,
#     })

#     return {
#         "status": "reset",
#         "message": "All PDFs and embeddings deleted"
#     }

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import os, shutil
from urllib.parse import unquote
from app.services.ingestion_service import ingest_pdf
import asyncio
from fastapi.concurrency import run_in_threadpool
from concurrent.futures import ThreadPoolExecutor

router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

INGESTION_STATUS = {}  # filename -> status

executor = ThreadPoolExecutor(max_workers=2)

def ingest_background(file_path: str, filename: str):
    # ⛔ prevent duplicate processing (skip only if already actively processing)
    if (
        filename in INGESTION_STATUS
        and INGESTION_STATUS[filename]["status"] == "processing"
    ):
        return

    # ✅ Update status from "pending" to "processing"
    INGESTION_STATUS[filename] = {
        "status": "processing",
        "pages": 0,
        "chunks": 0,
        "error": None,
    }

    try:
        # ✅ RUN BLOCKING CODE IN THREAD
        future = executor.submit(ingest_pdf, file_path)
        result = future.result()   # blocks THREAD, not event loop

        INGESTION_STATUS[filename].update({
            "status": "completed",
            "pages": result["pages"],
            "chunks": result["chunks"],
        })

    except Exception as e:
        INGESTION_STATUS[filename].update({
            "status": "failed",
            "error": str(e),
        })



@router.post("/")
async def ingest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # ✅ SAVE FILE SYNCHRONOUSLY (CRITICAL FIX)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # ✅ INITIALIZE STATUS IMMEDIATELY (prevents "not_found" race condition)
    # Only set if not already processing (prevents duplicate processing)
    if not (
        file.filename in INGESTION_STATUS
        and INGESTION_STATUS[file.filename]["status"] in ("pending", "processing")
    ):
        INGESTION_STATUS[file.filename] = {
            "status": "pending",
            "pages": 0,
            "chunks": 0,
            "error": None,
        }

    # ✅ START BACKGROUND INGESTION WITH FILE PATH
    background_tasks.add_task(
        ingest_background,
        file_path,
        file.filename
    )

    return {
        "status": "accepted",
        "filename": file.filename,
        "message": "PDF upload received. Processing started."
    }


@router.get("/status")
async def ingest_status(filename: str | None = None):
    if filename:
        return INGESTION_STATUS.get(filename, {"status": "not_found"})
    return INGESTION_STATUS


@router.delete("/delete/{filename}")
async def delete_pdf(filename: str):
    decoded_filename = unquote(filename)
    pdf_path = os.path.join(UPLOAD_DIR, decoded_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    os.remove(pdf_path)

    from app.services.ingestion_service import rebuild_vectorstore_from_uploads
    rebuild_vectorstore_from_uploads()

    INGESTION_STATUS.pop(decoded_filename, None)

    return {"status": "deleted", "filename": decoded_filename}


@router.delete("/reset")
async def reset_all_pdfs():
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    INGESTION_STATUS.clear()

    return {"status": "reset"}
    