from app.rag.prompts import RAG_PROMPT
from app.rag.retriever import get_retriever
from app.services.gemini_llm import generate_text
import re


def extract_keywords(text: str) -> list:
    """Extract meaningful keywords from text."""
    # Remove special chars and split into words
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    return list(set(words))


def semantic_similarity_score(doc_content: str, question: str) -> float:
    """
    Calculate semantic similarity between document and question.
    Uses keyword overlap as a simple but effective heuristic.
    """
    question_keywords = set(extract_keywords(question))
    doc_keywords = set(extract_keywords(doc_content))
    
    if not question_keywords:
        return 0.0
    
    overlap = len(question_keywords & doc_keywords)
    similarity = overlap / len(question_keywords)
    return similarity


def rank_documents(docs: list, question: str) -> list:
    """
    Re-rank documents by semantic relevance to the question.
    This ensures most relevant documents appear first.
    """
    if not docs:
        return docs
    
    scored_docs = [
        (doc, semantic_similarity_score(doc.page_content, question))
        for doc in docs
    ]
    
    # Sort by score descending
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    
    return [doc for doc, _ in scored_docs]


def run_rag(question: str, vectorstore, syllabus_context: str = "", marks: int = 3, chat_history: list = None):
    """
    Production-ready RAG pipeline with conversation memory:
    
    1. Retrieve diverse, relevant documents using MMR
    2. Rank them by semantic relevance to the question
    3. Build rich context from top documents
    4. Include conversation history for follow-up questions
    5. Generate answer with proper formatting
    6. Extract and return metadata
    
    Args:
        question: The user's question
        vectorstore: FAISS vectorstore with all PDF embeddings
        syllabus_context: User-provided syllabus/topics text
        marks: Answer length (3=short, 5=medium, 12=long)
        chat_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
    """
    retriever = get_retriever(vectorstore)

    # ════════════════════════════════════════════════════════════════
    # STEP 1: RETRIEVE - Use question + syllabus context for coverage
    # ════════════════════════════════════════════════════════════════
    # Search with question keywords (primary)
    question_docs = retriever.invoke(question)
    
    # Search with syllabus context if provided (secondary)
    context_docs_extra = []
    if syllabus_context and len(syllabus_context) > 10:
        # Extract key terms from syllabus for better retrieval
        syllabus_terms = syllabus_context[:500]  # Limit to prevent too broad search
        context_docs_extra = retriever.invoke(f"{syllabus_terms} {question}")
    
    # Merge and deduplicate (keep unique by content)
    combined_docs = question_docs + context_docs_extra
    unique_docs = []
    seen_content = set()
    
    for doc in combined_docs:
        content_hash = hash(doc.page_content)
        if content_hash not in seen_content:
            unique_docs.append(doc)
            seen_content.add(content_hash)

    if not unique_docs:
        return {
            "answer": (
                f"I couldn't find relevant information about '{question}' in the uploaded documents. "
                "Try asking differently or upload more relevant PDFs."
            ),
            "pages": [],
            "sources": [],
            "error": True
        }

    # ════════════════════════════════════════════════════════════════
    # STEP 2: RANK - Sort by semantic relevance to question
    # ════════════════════════════════════════════════════════════════
    ranked_docs = rank_documents(unique_docs, question)

    # ════════════════════════════════════════════════════════════════
    # STEP 3: BUILD CONTEXT - Combine top documents with separators
    # ════════════════════════════════════════════════════════════════
    # Use top 6 documents (quality over quantity)
    top_docs = ranked_docs[:6]
    
    context_parts = []
    for i, doc in enumerate(top_docs, 1):
        page_info = doc.metadata.get("page", "N/A")
        source_file = doc.metadata.get("source", "Unknown")
        # Extract just filename from path
        if isinstance(source_file, str):
            source_file = source_file.split("/")[-1].split("\\")[-1]
        context_parts.append(
            f"[Source {i} - {source_file}, Page {page_info}]\n{doc.page_content}"
        )
    
    context = "\n\n" + "─" * 70 + "\n\n".join(context_parts)

    # ════════════════════════════════════════════════════════════════
    # STEP 3.5: FORMAT CHAT HISTORY - Include conversation context
    # ════════════════════════════════════════════════════════════════
    formatted_chat_history = "No previous conversation."
    if chat_history and len(chat_history) > 0:
        # Limit to last 15 messages to maintain conversation context
        recent_history = chat_history[-15:]
        history_parts = []
        for msg in recent_history:
            role = "Student" if msg["role"] == "user" else "Tutor"
            # Truncate long messages to save context space
            content = msg["content"][:500] + "..." if len(msg["content"]) > 500 else msg["content"]
            history_parts.append(f"{role}: {content}")
        formatted_chat_history = "\n".join(history_parts)

    # ════════════════════════════════════════════════════════════════
    # STEP 4: GENERATE - Create prompt and call LLM
    # ════════════════════════════════════════════════════════════════
    # Format syllabus context for prompt
    formatted_syllabus = syllabus_context.strip() if syllabus_context else "No specific syllabus provided - answer based on all available content."
    
    prompt = RAG_PROMPT.format(
        syllabus_context=formatted_syllabus,
        marks=marks,
        context=context,
        question=question,
        chat_history=formatted_chat_history
    )

    try:
        response = generate_text(prompt)
    except Exception as e:
        return {
            "answer": f"Error generating response: {str(e)}",
            "pages": [],
            "sources": [],
            "error": True
        }

    # ════════════════════════════════════════════════════════════════
    # STEP 5: EXTRACT METADATA - Pages and sources
    # ════════════════════════════════════════════════════════════════
    pages = sorted({
        str(doc.metadata.get("page", "N/A"))
        for doc in top_docs
    })

    sources = [
        {
            "page": doc.metadata.get("page", "N/A"),
            "text": doc.page_content[:250]
        }
        for doc in top_docs
    ]

    return {
        "answer": response,
        "pages": pages,
        "sources": sources,
        "error": False
    }
