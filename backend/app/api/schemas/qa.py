from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class Source(BaseModel):

    page: int
    text: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    chunk_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="The message content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {"user", "assistant"}:
            raise ValueError("role must be 'user' or 'assistant'")
        return value

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("content cannot be empty")
        return cleaned[:2000]


class QARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    syllabus_context: Optional[str] = Field(default=None, max_length=10000)
    marks: Optional[int] = Field(default=3, ge=1, le=100)
    chat_history: Optional[List[ChatMessage]] = Field(default=None, max_length=30)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    document_ids: Optional[List[str]] = Field(default=None, max_length=25)
    document_names: Optional[List[str]] = Field(default=None, max_length=25)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("question cannot be empty")
        return cleaned

    @field_validator("syllabus_context")
    @classmethod
    def normalize_syllabus_context(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    def selected_identifiers(self) -> list[str]:
        merged: list[str] = []
        for group in (self.document_ids, self.document_names):
            for item in group or []:
                text = str(item).strip()
                if text and text not in merged:
                    merged.append(text)
        return merged


class QAResponse(BaseModel):
    answer: str
    pages: List[str]
    sources: List[Source]
    session_id: str
