"""Pydantic models for the mind-map API."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SourceType(str, Enum):
    UPLOADED_PDF = "uploaded_pdf"
    TEXT = "text"


class MindMapMode(str, Enum):
    FULL = "full"
    CHAPTER = "chapter"
    TOPIC = "topic"


class MindMapGenerateRequest(BaseModel):
    source_type: SourceType
    # Preferred: document ids. source_filenames stays for older clients.
    document_ids: list[str] = Field(default_factory=list, max_length=10)
    source_filenames: list[str] = Field(default_factory=list, max_length=10)
    text_content: Optional[str] = None
    mode: MindMapMode = MindMapMode.FULL
    selected_chapter: Optional[str] = None
    selected_topic: Optional[str] = None

    @field_validator("text_content")
    @classmethod
    def validate_text_content(cls, value, info):
        if info.data.get("source_type") == SourceType.TEXT:
            if not value or not value.strip():
                raise ValueError("Text content is required when source_type is 'text'")
            if len(value) > 100000:
                raise ValueError("Text content too long (max 100,000 characters)")
        return value

    def selected_identifiers(self) -> list[str]:
        merged: list[str] = []
        for group in (self.document_ids, self.source_filenames):
            for item in group or []:
                text = str(item).strip()
                if text and text not in merged:
                    merged.append(text)
        return merged


class MindMapRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class MindMapNode(BaseModel):
    title: str
    description: str = ""
    bullet_points: list[str] = Field(default_factory=list)
    children: list["MindMapNode"] = Field(default_factory=list)


class MindMapResponse(BaseModel):
    id: str
    title: str
    source: str
    created_at: str
    mindmap: MindMapNode


class TopicInfo(BaseModel):
    name: str


class ChapterInfo(BaseModel):
    name: str
    topics: list[TopicInfo] = Field(default_factory=list)


class DocumentStructure(BaseModel):
    filename: str
    chapters: list[ChapterInfo] = Field(default_factory=list)


class MindMapHistoryItem(BaseModel):
    id: str
    title: str
    source: str
    created_at: str
