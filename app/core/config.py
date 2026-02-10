# loading environment variables and logging
import os
from dotenv import load_dotenv
import logging

# reading the .env file so we can use environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# this class holds all the settings our app needs to run
class Settings:
    # the API key for Google Gemini AI - required for generating answers
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    # where we store our vector database on disk
    VECTOR_DB_PATH: str = os.getenv("VECTOR_DB_PATH", "app/data/vector_db")
    
    # warn if API key is missing because nothing will work without it
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set in environment variables")
    
    # how big each text chunk should be when splitting PDFs (in characters)
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    # how much overlap between chunks so we dont lose context at boundaries
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    # how many search results to return when looking for relevant content
    TOP_K: int = int(os.getenv("TOP_K", "8"))
    
    # check if we are in development or production mode
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    # turn on debug mode only in development
    DEBUG: bool = ENVIRONMENT == "development"
    
    # max file size for uploads is 50MB
    MAX_FILE_SIZE: int = 50 * 1024 * 1024
    # only PDF files are allowed for upload
    ALLOWED_FILE_TYPES: set = {"application/pdf"}

# creating a single settings instance that the whole app uses
settings = Settings()
