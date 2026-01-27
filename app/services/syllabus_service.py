# import re

# def parse_syllabus(text: str):
#     """
#     Converts syllabus text into structured units & topics.
#     """
#     syllabus = {}
#     current_unit = None

#     for line in text.splitlines():
#         line = line.strip()
#         if not line:
#             continue

#         # Detect Unit
#         unit_match = re.match(r"(Unit\s*\d+|UNIT\s*\d+)", line)
#         if unit_match:
#             current_unit = line
#             syllabus[current_unit] = []
#             continue

#         # Detect Topic
#         if current_unit:
#             syllabus[current_unit].append(line)

#     return syllabus

from langchain_community.document_loaders import PyPDFLoader
import tempfile
import re
from pypdf import PdfReader
from docx import Document

def extract_text_from_pdf(path: str) -> str:
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def extract_text_from_docx(path: str) -> str:
    doc = Document(path)
    text_parts = []
    
    # Iterate through all elements in the document body (paragraphs + tables)
    for element in doc.element.body:
        if element.tag.endswith('p'):  # Paragraph
            para = [p for p in doc.paragraphs if p._element == element][0]
            text_parts.append(para.text)
        elif element.tag.endswith('tbl'):  # Table
            # Extract table content
            table = [t for t in doc.tables if t._element == element][0]
            for row in table.rows:
                cells = [cell.text for cell in row.cells]
                text_parts.append(" | ".join(cells))
    
    return "\n".join(text_parts)


def parse_syllabus(file):
    """
    Parse syllabus from PDF or DOCX and extract structured data:
    - Subject
    - Units (e.g., Unit I, Unit II)
    - Topics for each unit
    - Infer answer formats (short, medium, long)
    
    Returns:
    {
        "subject": "Subject Name",
        "units": [
            {
                "name": "Unit I",
                "topics": ["topic1", "topic2"],
                "format": "long"
            }
        ]
    }
    """
    # Save uploaded file safely
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(file.file.read())
        path = tmp.name

    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(path)
        elif filename.endswith(".docx"):
            text = extract_text_from_docx(path)
        else:
            raise ValueError("Unsupported syllabus format. Please upload PDF or DOCX.")

    except Exception as e:
        raise ValueError(
            "Failed to read syllabus file. Please upload a valid PDF or DOCX."
        ) from e

    # ─────── EXTRACT SUBJECT ───────
    subject = extract_subject(text)

    # ─────── EXTRACT UNITS & TOPICS ───────
    units = extract_units_and_topics(text)

    if not units:
        # Fallback: treat entire content as one unit
        lines = [line.strip() for line in text.splitlines() if len(line.strip()) > 10]
        units = [
            {
                "name": "General Topics",
                "topics": lines[:50],
                "format": "long"
            }
        ]

    result = {
        "subject": subject,
        "units": units
    }

    return result


def extract_subject(text: str) -> str:
    """
    Extract subject name from syllabus text.
    Looks for patterns like: IC-101, CS301, COURSE CODE
    """
    # Try to find course code and name
    patterns = [
        r"IC-\d+[A-Z]?\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"CS\d+\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"COURSE\s*[:\-]\s*(.+?)(?:\n|$)",
        r"Subject\s*[:\-]\s*(.+?)(?:\n|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()[:100]  # Limit length

    # Fallback: use first line
    first_line = text.split('\n')[0].strip()
    return first_line[:100] if first_line else "Unknown Subject"


def extract_units_and_topics(text: str) -> list:
    """
    Extract units and topics from syllabus text.
    
    Returns list of dicts:
    [
        {"name": "Unit I", "topics": [...], "format": "long"},
        ...
    ]
    """
    units = []
    current_unit = None
    current_topics = []

    lines = text.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect Unit header (Unit I, Unit II, Unit 1, Unit 2, etc.)
        unit_match = re.match(r"(unit|module)\s+([ivx0-9]+|[a-z])\s*[:\-]?\s*(.*)", line, re.IGNORECASE)

        if unit_match:
            # Save previous unit if exists
            if current_unit and current_topics:
                units.append({
                    "name": current_unit,
                    "topics": current_topics,
                    "format": infer_format(current_topics)
                })

            # Start new unit
            unit_num = unit_match.group(2).upper()
            unit_title = unit_match.group(3) if unit_match.group(3) else ""
            current_unit = f"Unit {unit_num}" + (f": {unit_title}" if unit_title else "")
            current_topics = []

        # Add topics to current unit
        elif current_unit and len(line) > 4 and not line.startswith(("[", "•", "-", "*", "1", "2", "3")):
            current_topics.append(line)

    # Don't forget last unit
    if current_unit and current_topics:
        units.append({
            "name": current_unit,
            "topics": current_topics,
            "format": infer_format(current_topics)
        })

    return units


def infer_format(topics: list) -> str:
    """
    Infer answer format based on topic complexity.
    - Short: topic names only
    - Medium: brief descriptions
    - Long: detailed content
    """
    if not topics:
        return "short"

    avg_length = sum(len(t) for t in topics) / len(topics)

    if avg_length > 150:
        return "long"
    elif avg_length > 50:
        return "medium"
    else:
        return "short"
