# this file handles uploading PDFs, processing them, and deleting them
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import os
import shutil
import logging
from urllib.parse import unquote
from concurrent.futures import ThreadPoolExecutor
from app.services.ingestion_service import ingest_pdf

logger = logging.getLogger(__name__)

# creating a router for all PDF ingestion related endpoints
router = APIRouter(prefix="/ingest", tags=["Document Ingestion"])

# folder where uploaded PDFs are stored
UPLOAD_DIR = "app/data/uploads"
# create the folder if it doesnt exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# thread pool limits PDF processing to 2 at a time so we dont overload the system
executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf_ingest_")

# keeps track of which PDFs are processing, completed, or failed
INGESTION_STATUS = {}


# this runs in the background to process a PDF without blocking the user
def ingest_background(file_path: str, filename: str):
    # skip if this file is already being processed
    if (
        filename in INGESTION_STATUS
        and INGESTION_STATUS[filename]["status"] == "processing"
    ):
        return

    # mark the file as currently being processed
    INGESTION_STATUS[filename] = {
        "status": "processing",
        "pages": 0,
        "chunks": 0,
        "error": None,
    }

    try:
        # run the actual PDF processing in a separate thread
        future = executor.submit(ingest_pdf, file_path)
        # wait for it to finish and get the result
        result = future.result()

        # update status to completed with page and chunk counts
        INGESTION_STATUS[filename].update({
            "status": "completed",
            "pages": result["pages"],
            "chunks": result["chunks"],
        })

    except Exception as e:
        # if something went wrong, mark it as failed with the error message
        INGESTION_STATUS[filename].update({
            "status": "failed",
            "error": str(e),
        })


# rebuilds the search database after a PDF is deleted (runs in background)
def rebuild_vectorstore_background():
    try:
        from app.services.ingestion_service import rebuild_vectorstore_from_uploads
        rebuild_vectorstore_from_uploads()
        logger.info("Background vectorstore rebuild completed")
    except Exception as e:
        logger.error(f"Background rebuild failed: {e}")


# API endpoint to upload a PDF file
@router.post("/")
async def ingest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # only allow PDF and DOCX files
    if not file or not (file.filename.lower().endswith(".pdf") or file.filename.lower().endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files allowed")

    # save the uploaded file to disk
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # set initial status to pending (so frontend knows we got the file)
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

    # start processing the PDF in the background so we can respond immediately
    background_tasks.add_task(
        ingest_background,
        file_path,
        file.filename
    )

    # tell the frontend we got the file and started processing
    return {
        "status": "accepted",
        "filename": file.filename,
        "message": "PDF upload received. Processing started."
    }


# API endpoint to check the processing status of uploaded files
@router.get("/status")
async def ingest_status(filename: str | None = None):
    # if a specific filename is given, return just that files status
    if filename:
        return INGESTION_STATUS.get(filename, {"status": "not_found"})
    # otherwise return all statuses
    return INGESTION_STATUS


# API endpoint to delete a specific PDF
@router.delete("/delete/{filename}")
async def delete_pdf(background_tasks: BackgroundTasks, filename: str):
    # decode the filename in case it has special characters like spaces
    decoded_filename = unquote(filename)
    pdf_path = os.path.join(UPLOAD_DIR, decoded_filename)

    # check if the file actually exists
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    # delete the actual file from disk
    os.remove(pdf_path)
    
    # remove it from our status tracking
    INGESTION_STATUS.pop(decoded_filename, None)
    
    # rebuild the search database in the background (so the response is instant)
    background_tasks.add_task(rebuild_vectorstore_background)

    # respond immediately - the database rebuild happens in background
    return {"status": "deleted", "filename": decoded_filename}


# API endpoint to delete ALL uploaded PDFs and reset everything
@router.delete("/reset")
async def reset_all_pdfs(background_tasks: BackgroundTasks):
    # delete the entire uploads folder and recreate it empty
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    # clear all status tracking
    INGESTION_STATUS.clear()
    
    # clean up the vector database in the background
    def cleanup_vectordb():
        from app.core.config import settings
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
            logger.info("Vector DB cleared in background")
    
    background_tasks.add_task(cleanup_vectordb)

    return {"status": "reset"}