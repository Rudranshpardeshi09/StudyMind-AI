# these are the data models that define the shape of requests and responses for QA
from pydantic import BaseModel, Field
from typing import List, Optional

# represents a source reference from a PDF (which page and what text was found)
class Source(BaseModel):
    page: int
    text: str

# represents a single message in the chat history (either from user or AI)
class ChatMessage(BaseModel):
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="The message content")

# this is what the frontend sends when asking a question
class QARequest(BaseModel):
    # the actual question the student is asking
    question: str = Field(..., min_length=1, max_length=1000)
    # optional syllabus text to help the AI focus on relevant topics
    syllabus_context: Optional[str] = Field(
        default=None, 
        max_length=10000,
        description="User's syllabus, topics, or study context"
    )
    # how long the answer should be (3=short, 5=medium, 12=detailed)
    marks: Optional[int] = Field(
        default=3, 
        ge=1, 
        le=100,
        description="Answer length: 3=short, 5=medium, 12=long"
    )
    # previous messages so the AI can understand follow-up questions
    chat_history: Optional[List[ChatMessage]] = Field(
        default=None,
        max_length=30,
        description="Previous conversation messages for context (max 15 message pairs)"
    )

# this is what the backend sends back as the answer
class QAResponse(BaseModel):
    answer: str           # the AI-generated answer
    pages: List[str]      # list of page numbers where info was found
    sources: List[Source] # detailed source references for verification
