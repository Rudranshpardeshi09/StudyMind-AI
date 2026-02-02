import logging
import os, shutil
from langchain_community.document_loaders import PyPDFLoader
from app.rag.chunking import chunk_documents
from app.vectorstore.faiss_store import save_vectorstore
from fastapi import UploadFile

logger = logging.getLogger(__name__)
UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def ingest_pdf(input_source):
    """
    Accepts either:
    - UploadFile (from API upload)
    - str file_path (from background task)

    Behavior is identical for both.
    """

    # 🔑 NORMALIZE INPUT (NO BEHAVIOR CHANGE)
    if isinstance(input_source, UploadFile):
        filename = input_source.filename
        persistent_path = os.path.join(UPLOAD_DIR, filename)

        # ✅ Save file ONCE (required for delete/reset)
        with open(persistent_path, "wb") as f:
            shutil.copyfileobj(input_source.file, f)

    elif isinstance(input_source, str):
        persistent_path = input_source
        filename = os.path.basename(persistent_path)

        if not os.path.exists(persistent_path):
            raise FileNotFoundError(f"PDF not found: {persistent_path}")

    else:
        raise TypeError("ingest_pdf expects UploadFile or file path")

    try:
        logger.info(f"Loading PDF: {filename}")

        # 🔹 LOAD PDF
        loader = PyPDFLoader(persistent_path)
        documents = loader.load()

        if not documents:
            raise ValueError("PDF file is empty or unreadable")

        total_pages = len(documents)
        logger.info(f"Loaded {total_pages} pages from {filename}")

        # 🔹 CHUNK DOCUMENTS
        chunks = chunk_documents(documents)
        logger.info(f"Created {len(chunks)} chunks")

        # 🔹 SAVE VECTORSTORE (blocking, required)
        save_vectorstore(chunks)
        logger.info(f"Successfully ingested {filename}")

        # ✅ REQUIRED RETURN (this fixes endless polling)
        return {
            "status": "success",
            "filename": filename,
            "pages": total_pages,
            "chunks": len(chunks),
        }

    except Exception as e:
        logger.error(f"Error processing PDF {filename}: {str(e)}")
        raise

    # finally:
    #     # Clean up temporary file
    #     if persistent_path and os.path.exists(persistent_path):
    #         try:
    #             os.remove(persistent_path)
    #         except Exception as e:
    #             logger.warning(f"Failed to delete temp file {persistent_path}: {str(e)}")

def rebuild_vectorstore_from_uploads():
    from app.vectorstore.faiss_store import save_vectorstore
    from app.rag.chunking import chunk_documents
    from app.core.config import settings
    from langchain_community.document_loaders import PyPDFLoader
    import os, shutil

    uploads_dir = "app/data/uploads"

    # ✅ Guard: uploads directory does not exist
    if not os.path.exists(uploads_dir):
        return

    # ✅ Collect PDFs once (no behavior change)
    pdf_files = [
        f for f in os.listdir(uploads_dir)
        if f.endswith(".pdf")
    ]

    # ✅ If no PDFs exist → wipe vector DB and exit
    # (this logic already existed, just made explicit)
    if not pdf_files:
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
        return

    documents = []

    # 🔹 Load PDFs (same as before)
    for filename in pdf_files:
        loader = PyPDFLoader(os.path.join(uploads_dir, filename))
        documents.extend(loader.load())

    # ✅ Safety: no documents loaded
    if not documents:
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
        return

    # 🔹 Chunk + save (unchanged)
    chunks = chunk_documents(documents)
    save_vectorstore(chunks)

