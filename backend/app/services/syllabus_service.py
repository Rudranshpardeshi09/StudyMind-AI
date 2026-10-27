import re
from typing import List, Dict, Optional, Tuple
from pypdf import PdfReader
from docx import Document


def extract_text_from_pdf(path: str) -> Tuple[str, List[List[List[str]]]]:
    reader = PdfReader(path)
    text_parts = []
    tables = []
    
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text_parts.append(page_text)
        
        lines = page_text.split('\n')
        current_table = []
        
        for line in lines:
            if '|' in line or '\t' in line:
                cells = re.split(r'\s*\|\s*|\t+', line.strip())
                cells = [c.strip() for c in cells if c.strip()]
                if len(cells) >= 2:
                    current_table.append(cells)
            elif current_table:
                if len(current_table) >= 2:
                    tables.append(current_table)
                current_table = []
        
        if current_table and len(current_table) >= 2:
            tables.append(current_table)
    
    return '\n'.join(text_parts), tables


def extract_tables_from_docx(path: str) -> Tuple[str, List[List[List[str]]]]:
    doc = Document(path)
    text_parts = []
    tables = []
    
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text.strip())
    
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_cells = []
            for cell in row.cells:
                cell_text = cell.text.strip()
                row_cells.append(cell_text)
            if any(c for c in row_cells):
                table_data.append(row_cells)
        
        if len(table_data) >= 2:
            tables.append(table_data)
    
    return '\n'.join(text_parts), tables


def parse_syllabus_file(path: str, suffix: str) -> dict:
    if suffix == ".pdf":
        text, tables = extract_text_from_pdf(path)
    elif suffix == ".docx":
        text, tables = extract_tables_from_docx(path)
    else:
        raise ValueError("Unsupported syllabus format. Please upload PDF or DOCX.")

    subject = extract_subject_code(text)

    units = extract_units_from_tables(tables, text)
    if not units:
        units = extract_units_from_text(text)
    if not units:
        lines = [line.strip() for line in text.splitlines() if len(line.strip()) > 10]
        if not lines:
            raise ValueError("No readable text found in that syllabus.")
        units = [{
            "name": "General Topics",
            "title": "General Topics",
            "topics": lines[:50],
            "format": "long",
        }]

    return {"subject": subject, "units": units}


def extract_subject_code(text: str) -> str:
    subject_patterns = [
        r'([A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?)\s*[:\-–]?\s*([A-Za-z][A-Za-z\s&,\-]+)',
        r'(?:Subject\s*Code|Course\s*Code|Code)\s*[:\-–]?\s*([A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?)',
        r'(?:Subject\s*Name|Course\s*Name|Course\s*Title)\s*[:\-–]?\s*([A-Za-z][A-Za-z\s&,\-]+)',
    ]
    
    subject_code = ""
    subject_name = ""
    
    pattern1 = r'([A-Z]{2,4}[-\s]?\d{3,4}[A-Z]?)\s*[:\-–]?\s*([A-Za-z][A-Za-z\s&,\-]{3,50})'
    match = re.search(pattern1, text)
    if match:
        subject_code = match.group(1).strip()
        subject_name = match.group(2).strip()
        subject_name = re.sub(r'\s+', ' ', subject_name).strip()
        return f"{subject_code} {subject_name}"[:100]
    
    for pattern in subject_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result = match.group(1).strip()
            if match.lastindex >= 2:
                result = f"{result} {match.group(2).strip()}"
            return result[:100]
    
    for line in text.split('\n')[:10]:
        line = line.strip()
        if len(line) > 5 and not line.lower().startswith(('unit', 'module', 'chapter')):
            return line[:100]
    
    return "Unknown Subject"


def find_column_indices(header_row: List[str]) -> Dict[str, int]:
    indices = {"unit_no": -1, "title": -1, "contents": -1}
    
    unit_names = ['unit no', 'unit', 'unit no.', 'module', 'module no', 'sl', 'sno', 's.no', 'no', 'sr']
    title_names = ['title', 'topic', 'unit title', 'module title', 'name', 'chapter', 'heading']
    content_names = ['contents', 'content', 'topics', 'syllabus', 'description', 'details', 'sub-topics', 'subtopics']
    
    for idx, cell in enumerate(header_row):
        cell_lower = cell.lower().strip()
        
        if any(name in cell_lower for name in unit_names) and indices["unit_no"] == -1:
            indices["unit_no"] = idx
        elif any(name in cell_lower for name in title_names) and indices["title"] == -1:
            indices["title"] = idx
        elif any(name in cell_lower for name in content_names) and indices["contents"] == -1:
            indices["contents"] = idx
    
    return indices


def parse_contents_cell(content: str) -> List[str]:
    if not content:
        return []
    
    topics = re.split(r'[,;]\s*|\n+', content)
    
    cleaned_topics = []
    for topic in topics:
        topic = topic.strip()
        topic = re.sub(r'^[\d]+[.\)]\s*|^[a-z][.\)]\s*|^\([ivxlc]+\)\s*', '', topic, flags=re.IGNORECASE)
        topic = topic.strip()
        
        if len(topic) >= 3:
            cleaned_topics.append(topic)
    
    return cleaned_topics


def extract_units_from_tables(tables: List[List[List[str]]], text: str) -> List[Dict]:
    units = []
    
    for table in tables:
        if len(table) < 2:
            continue
        
        header_idx = 0
        indices = find_column_indices(table[0])
        
        if indices["contents"] == -1 and len(table) > 1:
            indices = find_column_indices(table[1])
            if indices["contents"] != -1:
                header_idx = 1
        
        if indices["contents"] == -1:
            continue
        
        for row_idx, row in enumerate(table[header_idx + 1:], start=1):
            if len(row) <= max(i for i in indices.values() if i >= 0):
                continue
            
            unit_no = ""
            if indices["unit_no"] >= 0 and indices["unit_no"] < len(row):
                unit_no = row[indices["unit_no"]].strip()
                unit_no = re.sub(r'^unit\s*', '', unit_no, flags=re.IGNORECASE).strip()
            
            if not unit_no:
                unit_no = str(row_idx)
            
            title = ""
            if indices["title"] >= 0 and indices["title"] < len(row):
                title = row[indices["title"]].strip()
            
            contents = ""
            if indices["contents"] >= 0 and indices["contents"] < len(row):
                contents = row[indices["contents"]]
            
            topics = parse_contents_cell(contents)
            
            if topics:
                unit_name = f"Unit {unit_no}"
                if title:
                    unit_name = f"Unit {unit_no}: {title}"
                
                units.append({
                    "name": unit_name,
                    "title": title or f"Unit {unit_no}",
                    "topics": topics,
                    "format": infer_format(topics)
                })
    
    return units


def extract_units_from_text(text: str) -> List[Dict]:
    units = []
    current_unit = None
    current_title = ""
    current_topics = []

    lines = text.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        unit_match = re.match(
            r'(?:unit|module|chapter)\s*([ivxlc0-9]+)\s*[:\-–]?\s*(.*)',
            line, re.IGNORECASE
        )

        if unit_match:
            if current_unit and current_topics:
                units.append({
                    "name": current_unit,
                    "title": current_title,
                    "topics": current_topics,
                    "format": infer_format(current_topics)
                })

            unit_num = unit_match.group(1).upper()
            current_title = unit_match.group(2).strip() if unit_match.group(2) else ""
            current_unit = f"Unit {unit_num}"
            if current_title:
                current_unit = f"Unit {unit_num}: {current_title}"
            current_topics = []

        elif current_unit:
            if ',' in line and len(line) > 10:
                topics = parse_contents_cell(line)
                current_topics.extend(topics)
            elif len(line) > 4 and not re.match(r'^[\d\-•*]+$', line):
                current_topics.append(line)

    if current_unit and current_topics:
        units.append({
            "name": current_unit,
            "title": current_title,
            "topics": current_topics,
            "format": infer_format(current_topics)
        })

    return units


def infer_format(topics: List[str]) -> str:
    if not topics:
        return "short"

    avg_length = sum(len(t) for t in topics) / len(topics)

    if avg_length > 100:
        return "long"
    elif avg_length > 40:
        return "medium"
    else:
        return "short"
