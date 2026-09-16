# Splits loaded documents into retrievable chunks.
import hashlib
import os

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings


def _normalize_metadata(metadata: dict) -> dict:
    normalized = dict(metadata or {})
    page = normalized.get("page")
    if isinstance(page, int):
        # PyPDFLoader is 0-based; humans and citations are 1-based.
        normalized["page"] = page + 1
    elif page in (None, "", "N/A"):
        normalized["page"] = 1
    if isinstance(normalized.get("source"), str):
        normalized["source"] = os.path.basename(normalized["source"])
    return normalized


def chunk_documents(documents, *, document_id: str = "", display_name: str = ""):
    """Split documents into chunks carrying the identity needed for citations.

    Each chunk records document_id so retrieval can filter by document and
    deletion can remove exactly this document's vectors, and display_name so a
    citation can name the file the passage came from.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "; ", ", ", " "],
    )

    chunks = []
    seen_chunk_ids = set()
    ordinal = 0

    for document in documents:
        for split_doc in splitter.split_documents([document]):
            content = split_doc.page_content.strip()
            if not content:
                continue

            split_doc.page_content = content
            split_doc.metadata = _normalize_metadata(split_doc.metadata)

            if display_name:
                split_doc.metadata["source"] = display_name
            if document_id:
                split_doc.metadata["document_id"] = document_id

            # Namespacing the hash by document_id keeps ids unique across
            # documents that happen to share identical text on the same page.
            seed = "{}|{}|{}|{}".format(
                document_id,
                split_doc.metadata.get("source", ""),
                split_doc.metadata.get("page", ""),
                content,
            )
            chunk_id = hashlib.sha1(seed.encode("utf-8")).hexdigest()
            if chunk_id in seen_chunk_ids:
                continue

            split_doc.metadata["chunk_id"] = chunk_id
            split_doc.metadata["ordinal"] = ordinal
            seen_chunk_ids.add(chunk_id)
            chunks.append(split_doc)
            ordinal += 1

    return chunks
