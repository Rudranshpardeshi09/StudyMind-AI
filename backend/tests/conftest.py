import hashlib
import math
import os
import re
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
os.environ["AUTH_RATE_LIMIT_PER_MINUTE"] = "0"
os.environ["RATE_LIMIT_PER_MINUTE"] = "0"
os.environ.setdefault("GEMINI_API_KEY", "test-key-not-used")
os.environ["EMBEDDING_PROVIDER"] = "gemini"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from langchain_core.embeddings import Embeddings  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.context import UserContext  # noqa: E402
from app.db.auth_db import get_connection, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.vectorstore import faiss_store  # noqa: E402


class FakeEmbeddings(Embeddings):

    def __init__(self, dimensions: int):
        self.dimensions = dimensions
        self.calls: list[tuple[str, int]] = []

    def _vector(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        for word in re.findall(r"[a-z]{3,}", text.lower()):
            digest = hashlib.md5(word.encode("utf-8")).digest()
            vector[int.from_bytes(digest[:4], "big") % self.dimensions] += 1.0
        norm = math.sqrt(sum(x * x for x in vector))
        if norm == 0.0:
            vector[0] = 1.0
            return vector
        return [x / norm for x in vector]

    def embed_documents(self, texts):
        self.calls.append(("documents", len(texts)))
        return [self._vector(t) for t in texts]

    def embed_query(self, text):
        self.calls.append(("query", 1))
        return self._vector(text)


@pytest.fixture(scope="session", autouse=True)
def _tmp_data_dir():
    init_db()
    yield _TMP
    shutil.rmtree(_TMP, ignore_errors=True)


@pytest.fixture(autouse=True)
def fake_embeddings(monkeypatch):
    fake = FakeEmbeddings(settings.EMBEDDING_DIMENSIONS)
    monkeypatch.setattr(faiss_store, "get_embeddings", lambda: fake)
    return fake


@pytest.fixture()
def inline_ingest(monkeypatch):
    monkeypatch.setattr("app.api.routes.ingest._schedule", lambda ctx, document_id: None)


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _clean_db():
    with get_connection() as conn:
        conn.execute("DELETE FROM users")
        conn.commit()
    yield


def register(client, email: str, password: str = "Passw0rd123") -> str:
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
