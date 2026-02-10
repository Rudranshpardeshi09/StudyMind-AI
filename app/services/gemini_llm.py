# this file handles all communication with Google's Gemini AI
import google.generativeai as genai
from functools import lru_cache
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


# this finds a working Gemini model and caches it so we dont search every time
@lru_cache(maxsize=1)
def get_working_model():
    # make sure we have an API key before trying anything
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    
    try:
        # connect to Gemini with our API key
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # loop through available models and pick the first one that can generate text
        for model in genai.list_models():
            if "generateContent" in model.supported_generation_methods:
                logger.info(f"Using Gemini model: {model.name}")
                return genai.GenerativeModel(model.name)
        
        # if no model supports text generation, something is wrong
        raise RuntimeError("No compatible Gemini model found")
    except Exception as e:
        logger.error(f"Error configuring Gemini: {str(e)}")
        raise


# this sends a prompt to Gemini and gets back the AI's response
def generate_text(prompt: str, temperature: float = 0.3, max_tokens: int = 4096) -> str:
    # make sure we got a valid prompt
    if not prompt or not isinstance(prompt, str):
        raise ValueError("Prompt must be a non-empty string")
    
    try:
        # get our cached Gemini model
        model = get_working_model()
        
        # safety settings to filter harmful content (set to only block high-severity stuff)
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ]
        
        # send the prompt to Gemini and get the response
        response = model.generate_content(
            prompt,
            safety_settings=safety_settings,
            generation_config={
                "temperature": temperature,      # lower = more focused and faster
                "max_output_tokens": max_tokens,  # max length of the response
                "candidate_count": 1,             # only generate one response for speed
            }
        )
        
        # if the response is empty, something went wrong
        if not response.text:
            logger.warning("Empty response from Gemini")
            raise ValueError("Empty response from model")
        
        # check if the response got cut off (truncated) before it was finished
        if hasattr(response, 'candidates') and response.candidates:
            finish_reason = response.candidates[0].finish_reason
            if finish_reason and str(finish_reason) not in ('STOP', 'FinishReason.STOP', '1'):
                logger.warning(f"Response may be incomplete. Finish reason: {finish_reason}")
        
        # return the clean response text
        return response.text.strip()
    
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise
