"""Document ingestion: parse, chunk, embed, index.

Every stage transition is persisted on the document row, so status survives a
restart and is never inferred from whether a directory happens to exist.
"""

import hashlib
import logging
import os
from pathlib import Path

from app.core.context import UserContext
from app.rag.chunking import chunk_documents
from app.services import document_service as docs
from app.vectorstore import faiss_store

logger = logging.getLogger(__name__)


class IngestionError(RuntimeError):
    """Raised with a message that is safe to show the user."""


def _load_pdf(path: str):
    from langchain_community.document_loaders import PyPDFLoader

    loader = PyPDFLoader(path)
    if hasattr(loader, "lazy_load"):
        return list(loader.lazy_load())
    return loader.load()


def _load_docx(path: str):
    """Split a DOCX into sections so citations are not all reported as page 1.

    A DOCX has no pages until it is rendered, so headings are used as section
    boundaries and the section index is reported as the page number.
    """
    from docx import Document as DocxDocument
    from langchain_core.documents import Document

    doc = DocxDocument(path)
    sections: list[list[str]] = [[]]

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = (para.style.name or "").lower() if para.style is not None else ""
        is_heading = style.startswith("heading") or style == "title"
        if is_heading and sections[-1]:
            sections.append([])
        sections[-1].append(text)

    documents = []
    for index, body in enumerate(sections, start=1):
        if not body:
            continue
        documents.append(
            Document(
                page_content="\n".join(body),
                metadata={"source": os.path.basename(path), "page": index},
            )
        )

    # A document with no headings still yields one section.
    return documents


def _load_documents(persistent_path: str):
    """Load a file into LangChain documents. Kept public for the mind-map service."""
    lowered = persistent_path.lower()
    if lowered.endswith(".pdf"):
        return _load_pdf(persistent_path)
    if lowered.endswith(".docx"):
        return _load_docx(persistent_path)
    raise IngestionError("Unsupported file format")


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def ingest_document(ctx: UserContext, document_id: str) -> dict:
    """Run the pipeline for one document, persisting each stage as it completes."""
    record = docs.get_document(ctx, document_id)
    if record is None:
        raise IngestionError("Document not found")

    storage = ctx.storage
    path = storage.upload_path(record["stored_name"])
    if not path.exists():
        docs.set_status(document_id, "failed", error="Uploaded file is missing")
        raise IngestionError("Uploaded file is missing")

    try:
        docs.set_status(document_id, "parsing")
        loaded = _load_documents(str(path))
        if not loaded:
            raise IngestionError(
                "No text could be extracted. If this is a scanned PDF it needs OCR first."
            )
        pages = len(loaded)

        chunks = chunk_documents(
            loaded,
            document_id=document_id,
            display_name=record["original_name"],
        )
        if not chunks:
            raise IngestionError("Document produced no usable text chunks")

        docs.set_status(document_id, "embedding", pages=pages)
        added = faiss_store.add_chunks(storage, chunks)

        docs.replace_chunks(
            document_id,
            [
                {
                    "chunk_id": c.metadata["chunk_id"],
                    "page": c.metadata.get("page", 1),
                    "ordinal": c.metadata.get("ordinal", i),
                }
                for i, c in enumerate(chunks)
            ],
        )
        docs.set_status(document_id, "ready", pages=pages, chunk_count=len(chunks))
        logger.info(
            "Indexed document %s for user %s: %s pages, %s chunks (%s new vectors)",
            document_id,
            ctx.user_id,
            pages,
            len(chunks),
            added,
        )
        return {"pages": pages, "chunks": len(chunks), "added": added}

    except IngestionError as exc:
        docs.set_status(document_id, "failed", error=str(exc))
        raise
    except Exception as exc:  # unexpected: log detail, show a generic message
        logger.exception("Ingestion failed for document %s", document_id)
        docs.set_status(
            document_id, "failed", error="Processing failed. Please retry this document."
        )
        raise IngestionError("Processing failed. Please retry this document.") from exc


def remove_document(ctx: UserContext, document_id: str) -> bool:
    """Delete one document: its vectors, its file, and its row.

    Vectors are removed by chunk id, so the remaining documents are never
    re-parsed or re-embedded.
    """
    record = docs.get_document(ctx, document_id)
    if record is None:
        return False

    chunk_ids = docs.get_chunk_ids(document_id)
    if chunk_ids:
        try:
            removed = faiss_store.delete_chunks(ctx.storage, chunk_ids)
            logger.info("Removed %s vectors for document %s", removed, document_id)
        except Exception:
            logger.exception("Vector cleanup failed for document %s", document_id)

    try:
        path = ctx.storage.upload_path(record["stored_name"])
        if path.exists():
            path.unlink()
    except OSError:
        logger.warning("Could not delete file for document %s", document_id)

    return docs.delete_document(ctx, document_id)


def reset_user_documents(ctx: UserContext) -> int:
    """Remove every document and the whole index for this user only."""
    removed = docs.delete_all_documents(ctx)
    faiss_store.reset_index(ctx.storage)
    uploads = ctx.storage.uploads_dir
    if uploads.exists():
        for entry in uploads.iterdir():
            if entry.is_file():
                try:
                    entry.unlink()
                except OSError:
                    logger.warning("Could not delete %s", entry.name)
    return removed
