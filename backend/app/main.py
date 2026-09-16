"""FastAPI application entry point."""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, chat, ingest, mindmap, qa, syllabus
from app.core.config import settings
from app.core.logging import configure_logging, new_request_id, request_id_var
from app.core.rate_limit import RateLimiter
from app.core.security import safe_decode_access_token
from app.db.auth_db import init_db

configure_logging(production=settings.IS_PRODUCTION)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info(
        "StudyMind API starting",
        extra={"environment": settings.ENVIRONMENT, "data_dir": str(settings.DATA_DIR)},
    )
    yield


# Interactive docs describe every endpoint and schema. Closed in production
# unless EXPOSE_DOCS is explicitly set.
_docs_enabled = settings.EXPOSE_DOCS or not settings.IS_PRODUCTION

app = FastAPI(
    title="StudyMind API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Auth is a bearer token, not a cookie, so credentials are not needed and
    # allowing them would force an exact-origin match for no benefit.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

_auth_limiter = RateLimiter(settings.AUTH_RATE_LIMIT_PER_MINUTE)
_api_limiter = RateLimiter(settings.RATE_LIMIT_PER_MINUTE)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Attach a request id, time the request, and emit one access line."""
    token = request_id_var.set(new_request_id())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled error", extra={"path": request.url.path, "method": request.method}
        )
        raise
    finally:
        duration_ms = (time.perf_counter() - started) * 1000
        request_id_var.reset(token)

    response.headers["X-Request-ID"] = request_id_var.get()
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 1),
        },
    )
    return response


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    is_auth = path.startswith("/auth/")
    limiter = _auth_limiter if is_auth else _api_limiter
    scope = "auth" if is_auth else "api"
    allowed, retry_after = limiter.allow(f"{scope}:{_client_key(request)}")
    if not allowed:
        logger.warning("Rate limited", extra={"path": path})
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down and try again."},
            headers={"Retry-After": str(retry_after)},
        )
    return await call_next(request)


def _is_public_path(path: str) -> bool:
    if path in ("/health", "/openapi.json", "/docs", "/redoc", "/docs/oauth2-redirect"):
        return True
    # Exact prefix with a separator, so a future "/authorize" route is not
    # accidentally treated as public.
    return path == "/auth" or path.startswith("/auth/")


@app.middleware("http")
async def require_auth(request: Request, call_next):
    if request.method == "OPTIONS" or not settings.AUTH_REQUIRED:
        return await call_next(request)
    if _is_public_path(request.url.path):
        return await call_next(request)

    header = request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    payload = safe_decode_access_token(header.split(" ", 1)[1].strip())
    if not payload or payload.get("typ") != "access":
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    try:
        request.state.user_id = int(payload["sub"])
    except (TypeError, ValueError, KeyError):
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    if settings.DEBUG:
        return JSONResponse(
            status_code=422,
            content={"detail": "Invalid request data", "errors": str(exc)},
        )
    # Validation detail can echo submitted values; keep it out of the response.
    return JSONResponse(status_code=422, content={"detail": "Invalid request data"})


@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}


app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(qa.router)
app.include_router(syllabus.router)
app.include_router(mindmap.router)
app.include_router(chat.router)
