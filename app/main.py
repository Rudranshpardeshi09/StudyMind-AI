# importing FastAPI framework and required modules
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
# importing our API route handlers
from app.api.routes import ingest, qa, syllabus
import os

# creating the main FastAPI app with a title and version
app = FastAPI(title="PDF RAG API", version="1.0.0")

# getting allowed origins from environment variable, defaults to localhost for development
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# setting up CORS so our frontend can talk to the backend without browser blocking it
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    # only allowing the HTTP methods we actually use
    allow_methods=["GET", "POST", "OPTIONS", "DELETE"],
    # only allowing headers our frontend sends
    allow_headers=["Content-Type", "Authorization"],
    # browser caches preflight check for 10 minutes so it doesnt keep asking
    max_age=600,
)

# this handles bad request data and sends back a clean error message
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data", "errors": str(exc)}
    )

# registering all our API routes with the main app
app.include_router(ingest.router)   # handles PDF upload and processing
app.include_router(qa.router)       # handles question answering
app.include_router(syllabus.router) # handles syllabus upload and parsing