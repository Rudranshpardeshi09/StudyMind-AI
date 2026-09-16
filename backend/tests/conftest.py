"""Test fixtures.

Each test module runs against a throwaway DATA_DIR so the developer's real
database, uploads and indexes are never touched. DATA_DIR must be set before
app.core.config is imported, which is why this happens at module import time.
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

_TMP = Path(tempfile.mkdtemp(prefix="studymind-tests-"))
os.environ["DATA_DIR"] = str(_TMP)
os.environ["ENVIRONMENT"] = "development"
os.environ["JWT_SECRET"] = "test-secret-that-is-long-enough-for-production-rules"
os.environ["AUTH_REQUIRED"] = "true"
# Rate limiting is exercised by its own test; leaving it on here would
# throttle the suite itself.
os.environ["AUTH_RATE_LIMIT_PER_MINUTE"] = "0"
os.environ["RATE_LIMIT_PER_MINUTE"] = "0"
os.environ.setdefault("GEMINI_API_KEY", "test-key-not-used")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.context import UserContext  # noqa: E402
from app.db.auth_db import get_connection, init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _tmp_data_dir():
    init_db()
    yield _TMP
    shutil.rmtree(_TMP, ignore_errors=True)


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _clean_db():
    """Start every test from an empty user table (cascades clear the rest)."""
    with get_connection() as conn:
        conn.execute("DELETE FROM users")
        conn.commit()
    yield


def register(client, email: str, password: str = "Passw0rd123") -> str:
    """Create a user and return their bearer token."""
    response = client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def context_for(client, token: str) -> UserContext:
    me = client.get("/auth/me", headers=auth_headers(token)).json()
    return UserContext(user_id=int(me["sub"]), email=me["email"])


@pytest.fixture()
def user_a(client):
    token = register(client, "alice@example.com")
    return {"token": token, "headers": auth_headers(token), "ctx": context_for(client, token)}


@pytest.fixture()
def user_b(client):
    token = register(client, "bob@example.com")
    return {"token": token, "headers": auth_headers(token), "ctx": context_for(client, token)}
