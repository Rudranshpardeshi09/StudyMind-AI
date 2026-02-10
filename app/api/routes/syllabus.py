# this file handles uploading and parsing syllabus files (PDF or DOCX)
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.syllabus_service import parse_syllabus

# creating a router for syllabus related endpoints
router = APIRouter(prefix="/syllabus", tags=["Syllabus"])


# this endpoint accepts a syllabus file and extracts the subject, units, and topics
@router.post("/upload")
async def upload_syllabus(file: UploadFile = File(...)):
    # make sure a file was actually uploaded
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # only allow PDF and DOCX format syllabi
    allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Only PDF and DOCX files are allowed"
        )

    # try to parse the syllabus and extract structured data
    try:
        parsed_syllabus = parse_syllabus(file)
        return parsed_syllabus
    except ValueError as e:
        # bad file format or content
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # something unexpected went wrong
        raise HTTPException(status_code=500, detail=f"Error parsing syllabus: {str(e)}")
