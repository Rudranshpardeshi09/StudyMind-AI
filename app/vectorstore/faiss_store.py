# this file manages our FAISS vector database where we store PDF embeddings
# embeddings are numerical representations of text that allow us to search by meaning

import os
import logging
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

# we cache the embeddings model so it only loads once (it takes time to load)
_embeddings_cache = None


# loads the embedding model that converts text into numbers the AI can search
def get_embeddings():
    global _embeddings_cache
    # only load the model if we havent loaded it before
    if _embeddings_cache is None:
        logger.info("Loading embeddings model...")
        # using a lightweight but good model that runs locally (no API calls needed)
        _embeddings_cache = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _embeddings_cache


# saves new text chunks into our vector database
def save_vectorstore(chunks, replace=False):
    embeddings = get_embeddings()
    
    # if we already have a database and we're not replacing it, merge new data in
    if not replace and os.path.exists(settings.VECTOR_DB_PATH):
        try:
            # load the existing database
            logger.info("Loading existing vectorstore to merge new documents...")
            existing_db = FAISS.load_local(
                settings.VECTOR_DB_PATH,
                embeddings,
                allow_dangerous_deserialization=True  # needed for loading saved FAISS files
            )
            
            # create a new database from the new chunks
            new_db = FAISS.from_documents(chunks, embeddings)
            
            # combine old and new data together
            existing_db.merge_from(new_db)
            
            # save the combined database back to disk
            existing_db.save_local(settings.VECTOR_DB_PATH)
            logger.info(f"Merged {len(chunks)} new chunks into existing vectorstore")
            
        except Exception as e:
            # if merging fails, just create a fresh database
            logger.warning(f"Failed to merge, creating new vectorstore: {e}")
            db = FAISS.from_documents(chunks, embeddings)
            db.save_local(settings.VECTOR_DB_PATH)
    else:
        # first time upload or explicit replace - create a brand new database
        logger.info(f"Creating new vectorstore with {len(chunks)} chunks...")
        db = FAISS.from_documents(chunks, embeddings)
        db.save_local(settings.VECTOR_DB_PATH)


# completely replaces the database (used after deleting a PDF to rebuild from scratch)
def replace_vectorstore(chunks):
    save_vectorstore(chunks, replace=True)


# loads the vector database from disk so we can search it
def load_vectorstore():
    # if no database exists yet, return nothing
    if not os.path.exists(settings.VECTOR_DB_PATH):
        return None
    
    # load and return the database
    return FAISS.load_local(
        settings.VECTOR_DB_PATH,
        get_embeddings(),
        allow_dangerous_deserialization=True
    )
