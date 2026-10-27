import io

import pytest

from app.core.rate_limit import RateLimiter
from app.core.storage import UnsafePathError, UserStorage
from tests.conftest import auth_headers, register


def test_register_rejects_weak_password(client):
    for weak in ("short1", "alllettersnodigits", "12345678"):
        response = client.post(
            "/auth/register", json={"email": "weak@example.com", "password": weak}
        )
        assert response.status_code == 422, f"{weak!r} should be rejected"


def test_register_rejects_duplicate_email(client):
    register(client, "dupe@example.com")
    response = client.post(
        "/auth/register", json={"email": "dupe@example.com", "password": "Passw0rd123"}
    )
    assert response.status_code == 409
    assert "exists" not in response.json()["detail"].lower()


def test_login_rejects_wrong_password(client):
    register(client, "user@example.com")
    response = client.post(
        "/auth/login", json={"email": "user@example.com", "password": "WrongPass123"}
    )
    assert response.status_code == 401


def test_login_error_does_not_distinguish_unknown_user(client):
    register(client, "known@example.com")
    wrong_pass = client.post(
        "/auth/login", json={"email": "known@example.com", "password": "WrongPass123"}
    )
    unknown = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "WrongPass123"}
    )
    assert wrong_pass.json()["detail"] == unknown.json()["detail"]


def test_token_without_access_type_is_rejected(client):
    from app.core.security import create_access_token

    token = create_access_token(subject="1", extra_claims={"typ": "refresh"})
    assert client.get("/auth/me", headers=auth_headers(token)).status_code == 401


def test_expired_token_is_rejected(client, monkeypatch):
    from datetime import datetime, timedelta, timezone

    from jose import jwt

    from app.core.config import settings

    expired = jwt.encode(
        {
            "sub": "1",
            "typ": "access",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert client.get("/auth/me", headers=auth_headers(expired)).status_code == 401


def test_token_signed_with_another_secret_is_rejected(client):
    from jose import jwt

    forged = jwt.encode({"sub": "1", "typ": "access"}, "attacker-secret", algorithm="HS256")
    assert client.get("/auth/me", headers=auth_headers(forged)).status_code == 401


def test_rejects_disallowed_extension(client, user_a):
    response = client.post(
        "/ingest/",
        headers=user_a["headers"],
        files={"file": ("payload.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert response.status_code == 400


def test_rejects_traversal_in_filename(client, user_a):
    response = client.post(
        "/ingest/",
        headers=user_a["headers"],
        files={"file": ("../../../../etc/passwd.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    if response.status_code == 200:
        stored = response.json()["document"]["stored_name"]
        assert "/" not in stored and "\\" not in stored and ".." not in stored


def test_rejects_oversize_upload(client, user_a, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_FILE_SIZE", 1024)
    response = client.post(
        "/ingest/",
        headers=user_a["headers"],
        files={"file": ("big.pdf", io.BytesIO(b"%PDF-1.4" + b"x" * 5000), "application/pdf")},
    )
    assert response.status_code == 413


def test_syllabus_rejects_content_extension_mismatch(client, user_a):
    response = client.post(
        "/syllabus/upload",
        headers=user_a["headers"],
        files={
            "file": (
                "syllabus.docx",
                io.BytesIO(b"%PDF-1.4 not really a docx"),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 400
    assert "do not match" in response.json()["detail"]


def test_document_limit_is_enforced(client, user_a, monkeypatch):
    from app.core.config import settings
    from app.services import document_service as docs

    monkeypatch.setattr(settings, "MAX_DOCUMENTS_PER_USER", 1)
    docs.create_document(
        user_a["ctx"], original_name="a.pdf", stored_name="a.pdf",
        byte_size=1, content_hash="x",
    )
    response = client.post(
        "/ingest/",
        headers=user_a["headers"],
        files={"file": ("b.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "name",
    ["../escape.pdf", "../../etc/passwd", "sub/dir.pdf", "..", ".", "", "a\x00b.pdf"],
)
def test_storage_refuses_paths_outside_the_user_root(name):
    storage = UserStorage(1)
    with pytest.raises((UnsafePathError, ValueError)):
        storage.upload_path(name)


def test_each_user_gets_a_distinct_root():
    assert UserStorage(1).root != UserStorage(2).root


def test_rate_limiter_allows_then_blocks():
    limiter = RateLimiter(limit=3, window_seconds=60)
    assert [limiter.allow("k")[0] for _ in range(3)] == [True, True, True]
    allowed, retry_after = limiter.allow("k")
    assert allowed is False
    assert retry_after > 0


def test_rate_limiter_is_per_key():
    limiter = RateLimiter(limit=1, window_seconds=60)
    assert limiter.allow("a")[0] is True
    assert limiter.allow("b")[0] is True, "one client must not throttle another"
    assert limiter.allow("a")[0] is False


def test_rate_limiter_disabled_when_limit_is_zero():
    limiter = RateLimiter(limit=0)
    assert all(limiter.allow("k")[0] for _ in range(50))


def test_production_requires_a_strong_jwt_secret(monkeypatch):
    import importlib

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "")
    with pytest.raises(RuntimeError, match="JWT_SECRET is required"):
        importlib.reload(importlib.import_module("app.core.config"))

    monkeypatch.setenv("JWT_SECRET", "short")
    with pytest.raises(RuntimeError, match="at least 32 characters"):
        importlib.reload(importlib.import_module("app.core.config"))

    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-long-enough-for-production-rules")
    importlib.reload(importlib.import_module("app.core.config"))
