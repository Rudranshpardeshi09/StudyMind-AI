import os
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings


def sanitize_filename(filename: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    basename = os.path.basename(filename).strip()
    if not basename or basename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")

    safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", basename)
    safe_name = re.sub(r"\s+", " ", safe_name).strip(" .")
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    extension = Path(safe_name).suffix.lower()
    if extension not in settings.ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join(sorted(settings.ALLOWED_FILE_EXTENSIONS))} files allowed",
        )

    return safe_name


def save_upload_file(upload: UploadFile, destination: str) -> int:
    size = 0
    upload.file.seek(0)
    with open(destination, "wb") as target:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.MAX_FILE_SIZE:
                target.close()
                try:
                    os.remove(destination)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds {settings.MAX_FILE_SIZE / (1024 * 1024):.0f}MB limit",
                )
            target.write(chunk)
    upload.file.seek(0)
    return size
