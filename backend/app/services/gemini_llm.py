import logging
import re
import time
from functools import lru_cache

from app.core.config import settings
from app.services import gemini_api

logger = logging.getLogger(__name__)

MODEL_FALLBACKS = [
    settings.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-pro",
]

_MODEL_COOLDOWNS: dict[str, float] = {}


def _normalize_model_name(model_name: str) -> str:
    return model_name.replace("models/", "", 1)


def _is_model_not_supported_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "404" in message
        or "not found" in message
        or "not supported for generatecontent" in message
    )


def _is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "429" in message or "quota exceeded" in message or "rate limit" in message


NON_TEXT_MODEL_MARKERS = ("image", "tts", "audio", "live", "embedding", "imagen", "veo", "robotics", "computer-use")


def _is_text_model(model_name: str) -> bool:
    lowered = model_name.lower()
    return not any(marker in lowered for marker in NON_TEXT_MODEL_MARKERS)


def _extract_retry_delay_seconds(exc: Exception) -> float:
    message = str(exc)
    match = re.search(
        r"retry in (?:([0-9]+)h)?(?:([0-9]+)m(?!s))?(?:([0-9]+(?:\.[0-9]+)?)s)?", message, re.IGNORECASE
    )
    if match and any(match.groups()):
        hours, minutes, seconds = (float(g) if g else 0.0 for g in match.groups())
        return hours * 3600 + minutes * 60 + seconds

    seconds_match = re.search(r"retry_delay\s*\{\s*seconds:\s*([0-9]+)", message, re.IGNORECASE | re.DOTALL)
    if seconds_match:
        return float(seconds_match.group(1))

    return 60.0


def _set_model_cooldown(model_name: str, delay_seconds: float):
    cooldown_until = time.time() + max(delay_seconds, 5.0)
    _MODEL_COOLDOWNS[model_name] = cooldown_until
    logger.warning("Cooling down Gemini model %s for %.1fs", model_name, max(delay_seconds, 5.0))


def _is_model_available_now(model_name: str) -> bool:
    cooldown_until = _MODEL_COOLDOWNS.get(model_name)
    if not cooldown_until:
        return True
    if cooldown_until <= time.time():
        _MODEL_COOLDOWNS.pop(model_name, None)
        return True
    return False


def _model_priority_key(model_name: str):
    lowered = model_name.lower()
    return (
        "lite" in lowered,
        not ("flash" in lowered),
        not ("2.5" in lowered),
        not ("2.0" in lowered),
        not ("1.5" in lowered),
        lowered,
    )


@lru_cache(maxsize=1)
def get_candidate_model_names() -> tuple[str, ...]:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    discovered = []
    try:
        for model in gemini_api.list_models():
            if "generateContent" not in (model.get("supportedGenerationMethods") or []):
                continue
            if not _is_text_model(model.get("name", "")):
                continue
            discovered.append(_normalize_model_name(model.get("name", "")))
    except Exception as exc:
        logger.warning("Failed to list Gemini models, falling back to configured names: %s", exc)

    ordered = []
    available = set(discovered)

    for preferred in MODEL_FALLBACKS:
        normalized = _normalize_model_name(preferred)
        if normalized in available and normalized not in ordered:
            ordered.append(normalized)

    if discovered:
        remaining = [name for name in discovered if name not in ordered]
        remaining.sort(key=_model_priority_key)
        ordered.extend(remaining)
    else:
        for normalized in (_normalize_model_name(name) for name in MODEL_FALLBACKS):
            if normalized not in ordered:
                ordered.append(normalized)

    if not ordered:
        raise RuntimeError("No compatible Gemini model found")

    logger.info("Gemini candidate models: %s", ", ".join(ordered[:8]))
    return tuple(ordered)


def generate_text(prompt: str, temperature: float = 0.3, max_tokens: int = 4096, response_mime_type: str | None = None) -> str:
    if not prompt or not isinstance(prompt, str):
        raise ValueError("Prompt must be a non-empty string")

    if len(prompt) > 100000:
        raise ValueError("Prompt exceeds maximum length (100K characters)")

    candidate_models = get_candidate_model_names()

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
    ]

    last_error = None
    attempted_any_model = False

    for model_name in candidate_models:
        if not _is_model_available_now(model_name):
            logger.info("Skipping Gemini model %s because it is in cooldown", model_name)
            continue

        attempted_any_model = True
        logger.info("Using Gemini model: %s", model_name)
        for attempt in range(2):
            started_at = time.perf_counter()
            try:
                config = {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "candidateCount": 1,
                }
                if response_mime_type:
                    config["responseMimeType"] = response_mime_type

                response = gemini_api.generate_content(model_name, prompt, config, safety_settings)
                text = gemini_api.response_text(response).strip()

                if not text:
                    logger.warning(
                        "Empty response from Gemini model %s on attempt %s",
                        model_name,
                        attempt + 1,
                    )
                    raise ValueError("Empty response from model")

                finish_reason = gemini_api.finish_reason(response)
                if finish_reason and finish_reason != "STOP":
                    logger.warning("Response may be incomplete. Finish reason: %s", finish_reason)

                logger.info(
                    "Gemini response completed in %.2fs using %s",
                    time.perf_counter() - started_at,
                    model_name,
                )
                return text
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Gemini attempt %s failed for model %s: %s",
                    attempt + 1,
                    model_name,
                    exc,
                )

                if _is_model_not_supported_error(exc):
                    logger.warning("Skipping unavailable Gemini model: %s", model_name)
                    break

                if _is_quota_error(exc):
                    _set_model_cooldown(model_name, _extract_retry_delay_seconds(exc))
                    break

                if attempt < 1:
                    time.sleep(0.4)

    if not attempted_any_model:
        raise RuntimeError("All Gemini models are temporarily cooling down due to quota limits")

    logger.error("Error generating text: %s", last_error)
    raise last_error
