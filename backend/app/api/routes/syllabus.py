"""Syllabus parsing.

This was the one upload path that bypassed the streamed size guard and trusted
the client-declared content type. It now goes through the same validated write
as document ingestion.
"""

import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.routes.auth import get_user_context
from app.core.context import UserContext
from app.services.syllabus_service import parse_syllabus_file
from app.utils.file_utils import save_upload_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

_ALLOWED_SUFFIXES = {".pdf", ".docx"}
# PDF and DOCX (a ZIP container) identified by magic bytes, not by the header
# the client chose to send.
_MAGIC = {b"%PDF": ".pdf", b"PK\x03\x04": ".docx"}


def _sniff(path: Path) -> str | None:
    with open(path, "rb") as handle:
        head = handle.read(4)
    for signature, suffix in _MAGIC.items():
        if head.startswith(signature):
            return suffix
    return None


@router.post("/upload")
async def upload_syllabus(
    file: UploadFile = File(...),
    _ctx: UserContext = Depends(get_user_context),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
        # Streams with the shared 50MB cap instead of reading the whole file.
        save_upload_file(file, str(tmp_path))

        actual = _sniff(tmp_path)
        if actual != suffix:
            raise HTTPException(
                status_code=400,
                detail="File contents do not match its extension",
            )

        return parse_syllabus_file(str(tmp_path), suffix)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Syllabus parsing failed")
        raise HTTPException(
            status_code=500, detail="Could not read that syllabus. Please try another file."
        )
    finally:
        if tmp_path is not None:
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError:
                logger.warning("Could not remove temporary syllabus file")
