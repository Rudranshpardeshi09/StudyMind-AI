import io

import pytest

from app.services import document_service as docs
from tests.conftest import auth_headers


def _pdf_bytes(text: str = "Photosynthesis converts light energy into chemical energy.") -> bytes:
    content = f"BT /F1 12 Tf 40 700 Td ({text}) Tj ET"
    objects = [
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        "/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
        "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
        f"5 0 obj<</Length {len(content)}>>stream\n{content}\nendstream endobj",
    ]
    body = "%PDF-1.4\n"
    offsets = []
    for obj in objects:
        offsets.append(len(body))
        body += obj + "\n"
    xref_at = len(body)
    body += f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n"
    for off in offsets:
        body += f"{off:010d} 00000 n \n"
    body += (
        f"trailer<</Size {len(objects)+1}/Root 1 0 R>>\nstartxref\n{xref_at}\n%%EOF\n"
    )
    return body.encode("latin-1")


def _upload(client, headers, name="notes.pdf"):
    return client.post(
        "/ingest/",
        headers=headers,
        files={"file": (name, io.BytesIO(_pdf_bytes()), "application/pdf")},
    )


def _make_document(ctx, name="secret.pdf"):
    record = docs.create_document(
        ctx, original_name=name, stored_name=name, byte_size=100, content_hash="h" + name
    )
    docs.set_status(record["id"], "ready", pages=1, chunk_count=2)
    return docs.get_document(ctx, record["id"])


def test_document_list_is_scoped(client, user_a, user_b):
    _make_document(user_a["ctx"], "alice-private.pdf")

    visible = client.get("/ingest/documents", headers=user_b["headers"]).json()["documents"]
    assert visible == [], "user B must not see user A's documents"

    own = client.get("/ingest/documents", headers=user_a["headers"]).json()["documents"]
    assert len(own) == 1 and own[0]["original_name"] == "alice-private.pdf"


def test_document_status_map_is_scoped(client, user_a, user_b):
    _make_document(user_a["ctx"], "alice-private.pdf")
    payload = client.get("/ingest/status", headers=user_b["headers"]).json()
    assert payload == {}, "the legacy status map must not leak filenames"


def test_cannot_read_another_users_document(client, user_a, user_b):
    doc = _make_document(user_a["ctx"])
    assert docs.get_document(user_b["ctx"], doc["id"]) is None


def test_cannot_delete_another_users_document_by_id(client, user_a, user_b):
    doc = _make_document(user_a["ctx"])
    response = client.delete(f"/ingest/{doc['id']}", headers=user_b["headers"])
    assert response.status_code == 404
    assert docs.get_document(user_a["ctx"], doc["id"]) is not None


def test_cannot_delete_another_users_document_by_name(client, user_a, user_b):
    doc = _make_document(user_a["ctx"], "shared-name.pdf")
    response = client.delete("/ingest/delete/shared-name.pdf", headers=user_b["headers"])
    assert response.status_code == 404
    assert docs.get_document(user_a["ctx"], doc["id"]) is not None


def test_reset_only_clears_own_documents(client, user_a, user_b):
    doc_a = _make_document(user_a["ctx"], "alice.pdf")
    _make_document(user_b["ctx"], "bob.pdf")

    assert client.delete("/ingest/reset", headers=user_b["headers"]).status_code == 200
    assert docs.get_document(user_a["ctx"], doc_a["id"]) is not None
    assert docs.list_documents(user_b["ctx"]) == []


def test_same_filename_does_not_collide_across_users(client, user_a, user_b):
    a = _make_document(user_a["ctx"], "notes.pdf")
    b = _make_document(user_b["ctx"], "notes.pdf")
    assert a["id"] != b["id"]
    assert user_a["ctx"].storage.root != user_b["ctx"].storage.root


def test_selection_cannot_reach_another_users_document(user_a, user_b):
    doc = _make_document(user_a["ctx"], "alice.pdf")
    resolved = docs.resolve_selection(user_b["ctx"], [doc["id"], "alice.pdf"])
    assert resolved == [], "document selection must not cross tenants"


def _make_mindmap(ctx, title="Alice Map"):
    from app.services.mindmap_service import _save

    payload = {
        "id": "map" + str(ctx.user_id).zfill(4),
        "title": title,
        "source": "alice.pdf",
        "created_at": "2026-01-01T00:00:00+00:00",
        "mindmap": {"title": title, "description": "d", "bullet_points": [], "children": []},
    }
    _save(ctx, payload, "full")
    return payload


def test_mindmap_history_is_scoped(client, user_a, user_b):
    _make_mindmap(user_a["ctx"])
    assert client.get("/mindmap/history", headers=user_b["headers"]).json() == []
    assert len(client.get("/mindmap/history", headers=user_a["headers"]).json()) == 1


def test_cannot_open_another_users_mindmap(client, user_a, user_b):
    m = _make_mindmap(user_a["ctx"])
    assert client.get(f"/mindmap/{m['id']}", headers=user_b["headers"]).status_code == 404
    assert client.get(f"/mindmap/{m['id']}", headers=user_a["headers"]).status_code == 200


def test_cannot_delete_another_users_mindmap(client, user_a, user_b):
    m = _make_mindmap(user_a["ctx"])
    assert client.delete(f"/mindmap/{m['id']}", headers=user_b["headers"]).status_code == 404
    assert client.get(f"/mindmap/{m['id']}", headers=user_a["headers"]).status_code == 200


def test_cannot_rename_another_users_mindmap(client, user_a, user_b):
    m = _make_mindmap(user_a["ctx"])
    response = client.patch(
        f"/mindmap/{m['id']}", headers=user_b["headers"], json={"title": "Hijacked"}
    )
    assert response.status_code == 404
    still = client.get(f"/mindmap/{m['id']}", headers=user_a["headers"]).json()
    assert still["title"] == "Alice Map"


def _make_session(ctx, question="What is mitosis?"):
    from app.services.chat_history_service import create_or_append_chat_turn

    return create_or_append_chat_turn(
        user_id=ctx.user_id,
        question=question,
        answer="An answer.",
        marks=3,
        syllabus_context=None,
        document_names=[],
        sources=[],
        session_id=None,
    )


def test_chat_sessions_are_scoped(client, user_a, user_b):
    _make_session(user_a["ctx"])
    assert client.get("/chat-sessions/", headers=user_b["headers"]).json() == []
    assert len(client.get("/chat-sessions/", headers=user_a["headers"]).json()) == 1


def test_cannot_open_or_delete_another_users_chat(client, user_a, user_b):
    session = _make_session(user_a["ctx"])
    sid = session["id"]
    assert client.get(f"/chat-sessions/{sid}", headers=user_b["headers"]).status_code == 404
    assert client.delete(f"/chat-sessions/{sid}", headers=user_b["headers"]).status_code == 404
    assert client.get(f"/chat-sessions/{sid}", headers=user_a["headers"]).status_code == 200


PROTECTED = [
    ("get", "/ingest/documents"),
    ("get", "/ingest/status"),
    ("get", "/mindmap/history"),
    ("get", "/chat-sessions/"),
    ("get", "/auth/me"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_reject_anonymous(client, method, path):
    assert getattr(client, method)(path).status_code in (401, 403)


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_reject_garbage_token(client, method, path):
    response = getattr(client, method)(path, headers=auth_headers("not-a-real-token"))
    assert response.status_code in (401, 403)


def test_qa_requires_auth(client):
    assert client.post("/qa/ask", json={"question": "hi"}).status_code in (401, 403)


def test_qa_stream_requires_auth(client):
    assert client.post("/qa/ask/stream", json={"question": "hi"}).status_code in (401, 403)
