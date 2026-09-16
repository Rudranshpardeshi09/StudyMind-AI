# Registration, login, Google OAuth token exchange, and current-user introspection
import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.api.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.core.config import settings
from app.core.context import UserContext
from app.core.security import create_access_token, safe_decode_access_token
from app.services import auth_user_service as users

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)
security_required = HTTPBearer(auto_error=True)


def _ensure_jwt_configured() -> None:
    if not settings.JWT_SECRET or len(settings.JWT_SECRET) < 16:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )


def _build_token_response(user_id: int, email: str) -> TokenResponse:
    token = create_access_token(
        subject=str(user_id),
        extra_claims={"email": email},
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    _ensure_jwt_configured()
    ok, _ = users.register_email_user(body.email, body.password)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to complete registration with this email",
        )
    row = users.get_user_by_email(body.email)
    if not row:
        logger.error("User missing after registration")
        raise HTTPException(status_code=500, detail="Registration failed")
    return _build_token_response(int(row["id"]), row["email"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    _ensure_jwt_configured()
    uid = users.authenticate_email_password(body.email, body.password)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    row = users.get_user_by_id(uid)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _build_token_response(uid, row["email"])


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest):
    _ensure_jwt_configured()
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )
    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        logger.warning("Invalid Google token: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials",
        )

    google_sub = idinfo.get("sub")
    email = idinfo.get("email")
    if not google_sub or not email or not isinstance(email, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token did not include required claims",
        )

    email_norm = email.strip().lower()
    row = users.get_user_by_google_sub(google_sub)
    if row:
        return _build_token_response(int(row["id"]), row["email"])

    existing = users.get_user_by_email(email_norm)
    if existing:
        uid = int(existing["id"])
        if not existing["google_sub"]:
            users.link_google_sub(uid, google_sub)
        elif existing["google_sub"] != google_sub:
            raise HTTPException(status_code=409, detail="Account conflict")
        row2 = users.get_user_by_id(uid)
        if not row2:
            raise HTTPException(status_code=500, detail="Login failed")
        return _build_token_response(uid, row2["email"])

    try:
        uid = users.create_google_user(email_norm, google_sub)
    except sqlite3.IntegrityError:
        row = users.get_user_by_google_sub(google_sub) or users.get_user_by_email(email_norm)
        if not row:
            raise HTTPException(status_code=409, detail="Unable to complete Google sign-in")
        uid = int(row["id"])
    return _build_token_response(uid, email_norm)


def _user_from_bearer_token(creds: HTTPAuthorizationCredentials) -> UserPublic:
    if creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = safe_decode_access_token(creds.credentials)
    if not payload or payload.get("typ") != "access":
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        uid = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Not authenticated")
    row = users.get_user_by_id(uid)
    if not row:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserPublic(sub=str(uid), email=row["email"])


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security_required),
) -> UserPublic:
    return _user_from_bearer_token(creds)


@router.get("/me", response_model=UserPublic)
async def me(user: UserPublic = Depends(get_current_user)):
    return user


async def get_user_context(
    creds: HTTPAuthorizationCredentials = Depends(security_required),
) -> UserContext:
    """Resolve the caller into a UserContext.

    Services take this as their first argument, which makes an unscoped query a
    call-site error rather than something a reviewer has to catch.
    """
    user = _user_from_bearer_token(creds)
    return UserContext(user_id=int(user.sub), email=user.email)
