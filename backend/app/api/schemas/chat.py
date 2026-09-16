from typing import List, Optional

from pydantic import BaseModel, Field

from app.api.schemas.qa import Source


class ChatSessionSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = Field(default=0, ge=0)
    marks: int = Field(default=3, ge=1, le=100)
    document_names: List[str] = Field(default_factory=list)
    last_message_preview: Optional[str] = None


class ChatMessageRecord(BaseModel):
    id: int
    role: str
    content: str
    created_at: str
    sources: List[Source] = Field(default_factory=list)


class ChatSessionDetail(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    syllabus_context: Optional[str] = None
    marks: int = Field(default=3, ge=1, le=100)
    document_names: List[str] = Field(default_factory=list)
    messages: List[ChatMessageRecord] = Field(default_factory=list)
