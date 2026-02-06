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
        if persistent_path.lower().endswith(".pdf"):
            loader = PyPDFLoader(persistent_path)
            documents = loader.load()
        elif persistent_path.lower().endswith(".docx"):
            from docx import Document as DocxDocument
            from langchain_core.documents import Document
            
            doc = DocxDocument(persistent_path)
            full_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text)
            
            # Create a single document for the whole DOCX (or split by paragraphs if preferred)
            # For consistency with PDF loader which yields pages, we can just treat the whole doc as one "page"
            # or try to split it. A single doc is fine for the chunker.
            documents = [Document(page_content="\n".join(full_text), metadata={"source": persistent_path})]
        else:
            raise ValueError("Unsupported file format")

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
    """
    Rebuild the entire vectorstore from all uploaded PDFs.
    Called after deleting a PDF to ensure consistency.
    """
    from app.vectorstore.faiss_store import replace_vectorstore
    from app.rag.chunking import chunk_documents
    from app.core.config import settings
    from langchain_community.document_loaders import PyPDFLoader
    import os
    import shutil

    uploads_dir = "app/data/uploads"

    # Guard: uploads directory does not exist
    if not os.path.exists(uploads_dir):
        return

    # Collect all PDF files
    pdf_files = [
        f for f in os.listdir(uploads_dir)
        if f.lower().endswith(".pdf") or f.lower().endswith(".docx")
    ]

    # If no PDFs exist → wipe vector DB and exit
    if not pdf_files:
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
        logger.info("No PDFs remaining, vectorstore cleared")
        return

    documents = []

    # Load ALL remaining PDFs
    for filename in pdf_files:
        # try:
        try:
            if filename.lower().endswith(".pdf"):
                loader = PyPDFLoader(os.path.join(uploads_dir, filename))
                documents.extend(loader.load())
            elif filename.lower().endswith(".docx"):
                 # Simplified DOCX loading for rebuild
                from docx import Document as DocxDocument
                from langchain_core.documents import Document
                path = os.path.join(uploads_dir, filename)
                doc = DocxDocument(path)
                text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                documents.append(Document(page_content=text, metadata={"source": path}))
            logger.info(f"Loaded {filename} for rebuild")
        except Exception as e:
            logger.warning(f"Failed to load {filename}: {e}")

    # Safety: no documents loaded
    if not documents:
        if os.path.exists(settings.VECTOR_DB_PATH):
            shutil.rmtree(settings.VECTOR_DB_PATH)
        return

    # Chunk and REPLACE vectorstore (not merge)
    chunks = chunk_documents(documents)
    replace_vectorstore(chunks)
    logger.info(f"Rebuilt vectorstore with {len(chunks)} chunks from {len(pdf_files)} PDFs")

