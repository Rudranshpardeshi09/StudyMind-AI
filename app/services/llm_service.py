from functools import lru_cache
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings


# Ordered from safest → best (Gemini reality)
GEMINI_MODEL_PRIORITY = [
    "gemini-1.0-pro",     # universally supported (v1beta, free tier)
    "gemini-1.5-flash",   # may or may not exist
    "gemini-1.5-pro",     # often restricted
]


@lru_cache(maxsize=1)
def get_llm():
    
    # Returns a Gemini LLM using a safe fallback strategy.
    # No probing calls. No runtime crashes.
    
    last_error = None

    for model_name in GEMINI_MODEL_PRIORITY:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0
            )

            
            print(f"[LLM] Selected Gemini model: {model_name}")
            return llm

        except Exception as e:
            last_error = e
            print(f"[LLM] Failed to initialize model: {model_name}")

    raise RuntimeError(
        "Failed to initialize any Gemini model. "
        "Check API key, billing, or model access."
    ) from last_error
