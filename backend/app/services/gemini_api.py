import httpx

from app.core.config import settings

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiAPIError(RuntimeError):
    def __init__(self, code: int, message: str):
        super().__init__(f"{code} {message}")
        self.code = code


def model_path(model: str) -> str:
    return model if model.startswith("models/") else f"models/{model}"


def _request(method: str, path: str, api_key: str | None = None, timeout: float = 120.0, **kwargs) -> dict:
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    try:
        response = httpx.request(
            method,
            f"{BASE_URL}/{path}",
            headers={"x-goog-api-key": key},
            timeout=timeout,
            **kwargs,
        )
    except httpx.TimeoutException as exc:
        raise GeminiAPIError(504, f"Deadline exceeded: {exc}") from exc
    except httpx.TransportError as exc:
        raise GeminiAPIError(503, f"Service unavailable: {exc}") from exc
    if response.status_code >= 400:
        try:
            message = response.json().get("error", {}).get("message", response.text)
        except ValueError:
            message = response.text
        raise GeminiAPIError(response.status_code, message)
    return response.json()


def list_models(api_key: str | None = None) -> list[dict]:
    models, token = [], None
    while True:
        params = {"pageSize": 1000}
        if token:
            params["pageToken"] = token
        page = _request("GET", "models", api_key=api_key, params=params)
        models.extend(page.get("models", []))
        token = page.get("nextPageToken")
        if not token:
            return models


def generate_content(model: str, prompt: str, generation_config: dict, safety_settings: list[dict]) -> dict:
    return _request(
        "POST",
        f"{model_path(model)}:generateContent",
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": generation_config,
            "safetySettings": safety_settings,
        },
    )


def batch_embed(model: str, texts: list[str], task_type: str, dimensions: int, api_key: str | None = None) -> list[list[float]]:
    name = model_path(model)
    result = _request(
        "POST",
        f"{name}:batchEmbedContents",
        api_key=api_key,
        json={
            "requests": [
                {
                    "model": name,
                    "content": {"parts": [{"text": text}]},
                    "taskType": task_type,
                    "outputDimensionality": dimensions,
                }
                for text in texts
            ]
        },
    )
    return [item["values"] for item in result.get("embeddings", [])]


def response_text(response: dict) -> str:
    candidates = response.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "".join(part.get("text", "") for part in parts if not part.get("thought"))


def finish_reason(response: dict) -> str | None:
    candidates = response.get("candidates") or []
    return candidates[0].get("finishReason") if candidates else None
