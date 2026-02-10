# this is the main RAG (Retrieval Augmented Generation) pipeline
# it finds relevant content from PDFs and uses AI to answer questions
from app.rag.prompts import RAG_PROMPT
from app.rag.retriever import get_retriever
from app.services.gemini_llm import generate_text
import re


# pulls out important words from a piece of text
def extract_keywords(text: str) -> set:
    words = set()
    # split text into words and keep only meaningful ones (3+ letters)
    for word in text.lower().split():
        cleaned = ''.join(c for c in word if c.isalpha())
        if len(cleaned) >= 3:
            words.add(cleaned)
    return words


# checks how similar a document is to the question by comparing keywords
def semantic_similarity_score(doc_content: str, question_keywords: set) -> float:
    if not question_keywords:
        return 0.0
    
    # find how many question keywords appear in the document
    doc_keywords = extract_keywords(doc_content)
    overlap = len(question_keywords & doc_keywords)
    # return a score between 0 and 1 (1 means all keywords matched)
    return overlap / len(question_keywords)


# sorts documents so the most relevant ones come first
def rank_documents(docs: list, question: str) -> list:
    if not docs:
        return docs
    
    # get question keywords once so we dont re-compute for every document
    question_keywords = extract_keywords(question)
    
    # score each document based on how relevant it is
    scored_docs = [
        (doc, semantic_similarity_score(doc.page_content, question_keywords))
        for doc in docs
    ]
    
    # sort highest score first
    scored_docs.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in scored_docs]


# this is the main function that answers a student's question using their uploaded PDFs
def run_rag(question: str, vectorstore, syllabus_context: str = "", marks: int = 3, chat_history: list = None):
    # create a search tool from our vector database
    retriever = get_retriever(vectorstore)

    # STEP 1: search for relevant content in the uploaded PDFs
    # if syllabus is provided, add a hint from it to improve search results
    search_query = question
    if syllabus_context and len(syllabus_context) > 20:
        search_query = f"{syllabus_context[:100]} {question}"
    
    # run the actual search
    docs = retriever.invoke(search_query)

    # if nothing was found, tell the student
    if not docs:
        return {
            "answer": f"I couldn't find relevant information about '{question}' in the uploaded documents.",
            "pages": [],
            "sources": [],
            "error": True
        }

    # STEP 2: re-rank the results so the best matches come first
    ranked_docs = rank_documents(docs, question)

    # STEP 3: take only the top 4 documents to keep things fast
    top_docs = ranked_docs[:4]
    
    # build the context string that will be sent to the AI
    context_parts = []
    for i, doc in enumerate(top_docs, 1):
        page_info = doc.metadata.get("page", "N/A")
        source_file = doc.metadata.get("source", "Unknown")
        # get just the filename, not the full path
        if isinstance(source_file, str):
            source_file = source_file.split("/")[-1].split("\\")[-1]
        # limit each document to 800 characters to prevent super long prompts
        content = doc.page_content[:800] if len(doc.page_content) > 800 else doc.page_content
        context_parts.append(f"[Source {i} - {source_file}, Page {page_info}]\n{content}")
    
    # join all document chunks with separators
    context = "\n\n---\n\n".join(context_parts)

    # STEP 4: format the chat history so the AI remembers previous messages
    formatted_chat_history = "No previous conversation."
    if chat_history and len(chat_history) > 0:
        # only keep the last 10 messages to save processing time
        recent_history = chat_history[-10:]
        history_parts = []
        for msg in recent_history:
            role = "Student" if msg["role"] == "user" else "Tutor"
            # shorten long messages to keep things manageable
            content = msg["content"][:300] + "..." if len(msg["content"]) > 300 else msg["content"]
            history_parts.append(f"{role}: {content}")
        formatted_chat_history = "\n".join(history_parts)

    # STEP 5: put everything together into the final prompt and send to AI
    formatted_syllabus = syllabus_context.strip() if syllabus_context else "No syllabus provided."
    
    # fill in the prompt template with all our data
    prompt = RAG_PROMPT.format(
        syllabus_context=formatted_syllabus,
        marks=marks,
        context=context,
        question=question,
        chat_history=formatted_chat_history
    )

    # send to Gemini AI and get the answer
    try:
        response = generate_text(prompt)
    except Exception as e:
        return {
            "answer": f"Error generating response: {str(e)}",
            "pages": [],
            "sources": [],
            "error": True
        }

    # STEP 6: collect page numbers and source info for the student to verify
    pages = sorted({str(doc.metadata.get("page", "N/A")) for doc in top_docs})
    sources = [
        {
            "page": doc.metadata.get("page", "N/A"),
            "text": doc.page_content[:200]  # short preview of what was found
        }
        for doc in top_docs
    ]

    # return the complete answer with sources
    return {
        "answer": response,
        "pages": pages,
        "sources": sources,
        "error": False
    }
