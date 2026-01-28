import google.generativeai as genai
from functools import lru_cache
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_working_model():
    """
    Automatically selects a Gemini model that supports text generation.
    Works on free tier. No hardcoded model names.
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        for model in genai.list_models():
            if "generateContent" in model.supported_generation_methods:
                logger.info(f"Using Gemini model: {model.name}")
                return genai.GenerativeModel(model.name)
        
        raise RuntimeError("No compatible Gemini model found")
    except Exception as e:
        logger.error(f"Error configuring Gemini: {str(e)}")
        raise


def generate_text(prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """
    Generate text using Gemini API with safety considerations.
    
    Args:
        prompt: The prompt to send to the model
        temperature: Controls randomness (0.0-1.0), lower = more deterministic
        max_tokens: Maximum tokens in response
    
    Returns:
        Generated text response
    """
    if not prompt or not isinstance(prompt, str):
        raise ValueError("Prompt must be a non-empty string")
    
    try:
        model = get_working_model()
        
        # Safety settings to prevent harmful content
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
        
        response = model.generate_content(
            prompt,
            safety_settings=safety_settings,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
        )
        
        if not response.text:
            logger.warning("Empty response from Gemini")
            raise ValueError("Empty response from model")
        
        return response.text
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise
