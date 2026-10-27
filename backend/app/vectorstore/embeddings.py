import logging
import math
import re
import time
import warnings

from langchain_core.embeddings import Embeddings

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MAX_BATCH = 100
_RETRYABLE_CODES = {429, 500, 502, 503, 504}
_RETRYABLE_MARKERS = (
    "429",
    "resource exhausted",
    "resourceexhausted",
    "quota",
    "rate limit",
    "503",
    "service unavailable",
    "500 internal",
    "internal error",
    "deadline exceeded",
)


class EmbeddingServiceError(RuntimeError):
    pass


def l2_normalize(vector) -> list[float]:
    values = [float(x) for x in vector]
    norm = math.sqrt(sum(x * x for x in values))
    if norm == 0.0:
        return values
    return [x / norm for x in values]


def _is_retryable(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    if isinstance(code, int) and code in _RETRYABLE_CODES:
        return True
    name = type(exc).__name__.lower()
    if name in {"resourceexhausted", "toomanyrequests", "serviceunavailable",
                "internalservererror", "deadlineexceeded", "badgateway", "gatewaytimeout"}:
        return True
    message = str(exc).lower()
    return any(marker in message for marker in _RETRYABLE_MARKERS)


def _retry_hint_seconds(exc: Exception):
    match = re.search(r"retry in ([0-9]+(?:\.[0-9]+)?)s", str(exc), re.IGNORECASE)
    return float(match.group(1)) if match else None


class GeminiEmbeddings(Embeddings):

    def __init__(
        self,
        model: str,
        dimensions: int,
        api_key: str,
        batch_size: int = GEMINI_MAX_BATCH,
        max_attempts: int = 5,
        base_delay: float = 2.0,
        max_delay: float = 30.0,
    ):
        self.model = model if model.startswith("models/") else f"models/{model}"
        self.dimensions = int(dimensions)
        self.api_key = api_key
        self.batch_size = max(1, min(int(batch_size), GEMINI_MAX_BATCH))
        self.max_attempts = max(1, int(max_attempts))
        self.base_delay = base_delay
        self.max_delay = max_delay
        self._sleep = time.sleep
        self._genai = None

    def _client(self):
        if self._genai is None:
            if not self.api_key:
                raise EmbeddingServiceError("GEMINI_API_KEY is not configured")
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", FutureWarning)
                import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._genai = genai
        return self._genai

    def _request(self, batch: list[str], task_type: str) -> list[list[float]]:
        genai = self._client()
        for attempt in range(1, self.max_attempts + 1):
            try:
                result = genai.embed_content(
                    model=self.model,
                    content=batch,
                    task_type=task_type,
                    output_dimensionality=self.dimensions,
                )
                vectors = result["embedding"]
                if len(vectors) != len(batch):
                    raise EmbeddingServiceError(
                        f"Gemini returned {len(vectors)} embeddings for {len(batch)} inputs"
                    )
                return vectors
            except EmbeddingServiceError:
                raise
            except Exception as exc:
                if not _is_retryable(exc):
                    raise EmbeddingServiceError(f"Gemini embedding request failed: {exc}") from exc
                if attempt >= self.max_attempts:
                    raise EmbeddingServiceError(
                        f"Gemini embedding request still failing after {attempt} attempts "
                        f"(rate limited or unavailable): {exc}"
                    ) from exc
                backoff = self.base_delay * (2 ** (attempt - 1))
                hint = _retry_hint_seconds(exc)
                delay = min(self.max_delay, max(backoff, hint or 0.0))
                logger.warning(
                    "Gemini embedding attempt %s/%s failed (%s); retrying in %.1fs",
                    attempt, self.max_attempts, exc, delay,
                )
                self._sleep(delay)
        raise EmbeddingServiceError("Gemini embedding request failed")

    def _embed(self, texts: list[str], task_type: str) -> list[list[float]]:
        vectors = []
        for start in range(0, len(texts), self.batch_size):
            batch = [t if t.strip() else " " for t in texts[start:start + self.batch_size]]
            vectors.extend(l2_normalize(v) for v in self._request(batch, task_type))
        return vectors

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(list(texts), "RETRIEVAL_DOCUMENT")

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text], "RETRIEVAL_QUERY")[0]


def embedding_signature() -> dict:
    provider = settings.EMBEDDING_PROVIDER
    if provider == "gemini":
        return {
            "provider": "gemini",
            "model": settings.GEMINI_EMBEDDING_MODEL,
            "dimensions": settings.EMBEDDING_DIMENSIONS,
        }
    if provider == "local":
        return {"provider": "local", "model": settings.EMBEDDING_MODEL, "dimensions": None}
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {provider!r} (expected 'gemini' or 'local')")


def build_embeddings() -> Embeddings:
    provider = settings.EMBEDDING_PROVIDER
    if provider == "gemini":
        logger.info(
            "Using Gemini embeddings %s (%s dims)",
            settings.GEMINI_EMBEDDING_MODEL, settings.EMBEDDING_DIMENSIONS,
        )
        return GeminiEmbeddings(
            model=settings.GEMINI_EMBEDDING_MODEL,
            dimensions=settings.EMBEDDING_DIMENSIONS,
            api_key=settings.GEMINI_API_KEY,
        )
    if provider == "local":
        logger.info("Loading local embeddings model %s", settings.EMBEDDING_MODEL)
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
        except ImportError as exc:
            raise RuntimeError(
                "EMBEDDING_PROVIDER=local needs the optional packages: "
                "pip install -r requirements-local.txt"
            ) from exc
        return HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL,
            encode_kwargs={
                "normalize_embeddings": True,
                "batch_size": settings.EMBEDDING_BATCH_SIZE,
            },
        )
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {provider!r} (expected 'gemini' or 'local')")
