# importing the prompt template class from langchain
from langchain_core.prompts import PromptTemplate

# this is the main prompt template that tells the AI how to answer questions
# it gets filled in with the actual question, context from PDFs, chat history etc
RAG_PROMPT = PromptTemplate(
    # these are the placeholders that get replaced with actual values
    input_variables=[
        "syllabus_context",  # what syllabus topics the student is studying
        "context",           # relevant text extracted from uploaded PDFs
        "question",          # the students actual question
        "marks",             # how long the answer should be (3, 5, or 12 marks)
        "chat_history"       # previous messages so AI remembers the conversation
    ],
    # the actual prompt text sent to Gemini AI
    template="""You are an expert academic tutor. Answer ONLY from the provided study material.

GUIDELINES:
- Use information from the PDF content ONLY
- If information is absent, state clearly
- Structure answer by marks requirement
- Consider conversation history for follow-ups

ANSWER FORMAT:
• 3 MARKS: 60-100 words, 3-4 bullet points
• 5 MARKS: 150-200 words, 5-7 structured points
• 12 MARKS: 350-450 words, 3-4 sections with subheadings

---
SYLLABUS CONTEXT: {syllabus_context}
MARKS REQUIRED: {marks}
---
CONVERSATION HISTORY:
{chat_history}
---
PDF CONTENT:
{context}
---
QUESTION: {question}
---
ANSWER ({marks} MARKS):"""
)