import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class Settings:
    # ════════════════════════════════════════════════════════════════════════════════
    # SECURITY: Validate critical environment variables
    # ════════════════════════════════════════════════════════════════════════════════
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    VECTOR_DB_PATH: str = os.getenv("VECTOR_DB_PATH", "app/data/vector_db")
    
    # Validation
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set in environment variables")
    
    # ════════════════════════════════════════════════════════════════════════════════
    # RAG Configuration
    # ════════════════════════════════════════════════════════════════════════════════
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    TOP_K: int = int(os.getenv("TOP_K", "8"))
    
    # ════════════════════════════════════════════════════════════════════════════════
    # Environment
    # ════════════════════════════════════════════════════════════════════════════════
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"
    
    # ════════════════════════════════════════════════════════════════════════════════
    # Constraints
    # ════════════════════════════════════════════════════════════════════════════════
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_FILE_TYPES: set = {"application/pdf"}

settings = Settings()
