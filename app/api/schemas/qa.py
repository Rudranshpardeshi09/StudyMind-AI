from pydantic import BaseModel, Field
from typing import List, Optional

class Source(BaseModel):
    page: int
    text: str

class ChatMessage(BaseModel):
    """A single message in the chat history."""
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="The message content")

class QARequest(BaseModel):
    """Request model for QA endpoint."""
    question: str = Field(..., min_length=1, max_length=1000)
    syllabus_context: Optional[str] = Field(
        default=None, 
        max_length=10000,
        description="User's syllabus, topics, or study context"
    )
    marks: Optional[int] = Field(
        default=3, 
        ge=1, 
        le=100,
        description="Answer length: 3=short, 5=medium, 12=long"
    )
    chat_history: Optional[List[ChatMessage]] = Field(
        default=None,
        max_length=30,
        description="Previous conversation messages for context (max 15 message pairs)"
    )

class QAResponse(BaseModel):
    """Response model for QA endpoint."""
    answer: str
    pages: List[str]
    sources: List[Source]
