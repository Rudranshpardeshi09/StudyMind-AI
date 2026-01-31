import tempfile
import logging
import os, shutil
from langchain_community.document_loaders import PyPDFLoader
from app.rag.chunking import chunk_documents
from app.vectorstore.faiss_store import save_vectorstore

logger = logging.getLogger(__name__)
UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def ingest_pdf(uploaded_file):
    """
    Handles PDF ingestion:
    - Saves temp PDF
    - Loads page-aware documents
    - Chunks intelligently for large PDFs
    - Stores embeddings in FAISS
    
    Returns:
    {
        "status": "success",
        "message": "PDF ingested successfully",
        "filename": "filename.pdf",
        "pages": <number of pages>
    }
    """
    filename = uploaded_file.filename
    persistent_path = os.path.join(UPLOAD_DIR, filename)
    try:
        # ✅ SAVE PDF PERMANENTLY (required for delete/reset)
        with open(persistent_path, "wb") as f:
            shutil.copyfileobj(uploaded_file.file, f)

        # Load documents with page information
        logger.info(f"Loading PDF: {uploaded_file.filename}")
        loader = PyPDFLoader(persistent_path)
        documents = loader.load()

        if not documents:
            raise ValueError("PDF file is empty or cannot be read")

        total_pages = len(documents)
        logger.info(f"Loaded {total_pages} pages from {uploaded_file.filename}")

        # Chunk documents intelligently
        chunks = chunk_documents(documents)
        logger.info(f"Created {len(chunks)} chunks")

        # Save to vector store
        save_vectorstore(chunks)
        logger.info(f"Successfully ingested {uploaded_file.filename}")

        return {
            "status": "success",
            "message": "PDF ingested successfully",
            "filename": uploaded_file.filename,
            "pages": total_pages,
            "chunks": len(chunks)
        }
    except Exception as e:
        logger.error(f"Error processing PDF {uploaded_file.filename}: {str(e)}")
        raise Exception(f"Error processing PDF: {str(e)}")
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

    documents = []

    uploads_dir = "app/data/uploads"
    if not os.path.exists(uploads_dir):
        return

    for filename in os.listdir(uploads_dir):
        if filename.endswith(".pdf"):
            loader = PyPDFLoader(os.path.join(uploads_dir, filename))
            documents.extend(loader.load())

    if not documents:
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
        return

    chunks = chunk_documents(documents)
    save_vectorstore(chunks)
