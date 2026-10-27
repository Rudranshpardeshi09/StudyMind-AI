import logging
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _resolve_data_dir() -> Path:
    configured = os.getenv("DATA_DIR", "").strip()
    path = Path(configured).expanduser() if configured else _BACKEND_ROOT / "data"
    path = path.resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


DATA_DIR = _resolve_data_dir()

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
_IS_PRODUCTION = _ENVIRONMENT == "production"


def _load_jwt_secret() -> str:
    configured = os.getenv("JWT_SECRET", "").strip()
    if configured:
        if len(configured) < 32 and _IS_PRODUCTION:
            raise RuntimeError(
                "JWT_SECRET must be at least 32 characters in production."
            )
        return configured

    if _IS_PRODUCTION:
        raise RuntimeError(
            "JWT_SECRET is required when ENVIRONMENT=production. "
            "Generate one with: python -c \"import secrets;print(secrets.token_urlsafe(48))\""
        )

    secret_path = DATA_DIR / ".jwt_secret"
    try:
        existing = secret_path.read_text(encoding="utf-8").strip()
        if len(existing) >= 16:
            return existing
    except FileNotFoundError:
        pass
    except OSError:
        logger.warning("Unable to read persisted JWT secret; generating a new one")

    generated = secrets.token_urlsafe(48)
    try:
        secret_path.parent.mkdir(parents=True, exist_ok=True)
        secret_path.write_text(generated, encoding="utf-8")
        logger.warning(
            "JWT_SECRET not set; generated a development-only secret at %s", secret_path
        )
    except OSError:
        logger.warning("JWT_SECRET not set and fallback secret could not be persisted")
    return generated


class Settings:
    ENVIRONMENT: str = _ENVIRONMENT
    IS_PRODUCTION: bool = _IS_PRODUCTION
    DEBUG: bool = _ENVIRONMENT == "development"

    DATA_DIR: Path = DATA_DIR
    USERS_DIR: Path = DATA_DIR / "users"
    DB_PATH: Path = DATA_DIR / "auth.db"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "900"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    TOP_K: int = int(os.getenv("TOP_K", "6"))
    RETRIEVER_FETCH_K: int = int(os.getenv("RETRIEVER_FETCH_K", "18"))
    MAX_CONTEXT_CHARS: int = int(os.getenv("MAX_CONTEXT_CHARS", "4800"))
    LEXICAL_WEIGHT: float = float(os.getenv("LEXICAL_WEIGHT", "0.25"))
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "gemini").strip().lower()
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    EMBEDDING_DIMENSIONS: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
    EMBEDDING_MODEL: str = os.getenv(
        "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    MAX_CACHED_INDEXES: int = int(os.getenv("MAX_CACHED_INDEXES", "8"))

    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(50 * 1024 * 1024)))
    ALLOWED_FILE_TYPES: set = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    ALLOWED_FILE_EXTENSIONS: set = {".pdf", ".docx"}
    MAX_DOCUMENTS_PER_USER: int = int(os.getenv("MAX_DOCUMENTS_PER_USER", "50"))

    MAX_CHAT_HISTORY: int = int(os.getenv("MAX_CHAT_HISTORY", "10"))
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "0"))
    AUTH_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "10"))
    MAX_PERSISTED_CHAT_SESSIONS: int = int(os.getenv("MAX_PERSISTED_CHAT_SESSIONS", "50"))
    TRUST_PROXY: bool = os.getenv("TRUST_PROXY", "false").lower() in ("1", "true", "yes")

    JWT_SECRET: str = _load_jwt_secret()
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )
    AUTH_REQUIRED: bool = os.getenv("AUTH_REQUIRED", "true").lower() in ("1", "true", "yes")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    EXPOSE_DOCS: bool = os.getenv("EXPOSE_DOCS", "").lower() in ("1", "true", "yes")


settings = Settings()

if settings.EMBEDDING_PROVIDER not in ("gemini", "local"):
    raise RuntimeError("EMBEDDING_PROVIDER must be 'gemini' or 'local'")

if not settings.GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set — answer generation will fail")
