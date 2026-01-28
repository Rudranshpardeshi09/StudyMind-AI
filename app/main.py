from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.routes import ingest, qa, syllabus
import os

app = FastAPI(title="PDF RAG API", version="1.0.0")

# ════════════════════════════════════════════════════════════════════════════════
# SECURITY: CORS Configuration - Only allow specific methods/headers
# ════════════════════════════════════════════════════════════════════════════════
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Only necessary methods
    allow_headers=["Content-Type", "Authorization"],  # Only necessary headers
    max_age=600,  # Cache preflight for 10 minutes
)

# ════════════════════════════════════════════════════════════════════════════════
# ERROR HANDLING - Consistent error responses
# ════════════════════════════════════════════════════════════════════════════════
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data", "errors": str(exc)}
    )

app.include_router(ingest.router)
app.include_router(qa.router)
app.include_router(syllabus.router)