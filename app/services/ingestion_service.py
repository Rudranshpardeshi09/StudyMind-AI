import tempfile
import logging
import os
from langchain_community.document_loaders import PyPDFLoader
from app.rag.chunking import chunk_documents
from app.vectorstore.faiss_store import save_vectorstore

logger = logging.getLogger(__name__)


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
    pdf_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = uploaded_file.file.read()
            tmp.write(content)
            pdf_path = tmp.name

        # Load documents with page information
        logger.info(f"Loading PDF: {uploaded_file.filename}")
        loader = PyPDFLoader(pdf_path)
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
    finally:
        # Clean up temporary file
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {pdf_path}: {str(e)}")
