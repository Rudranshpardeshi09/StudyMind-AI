import io

import pytest

from app.services import document_service as docs
from app.vectorstore import faiss_store
from tests.test_tenancy import _pdf_bytes

pytestmark = pytest.mark.usefixtures("inline_ingest")


@pytest.fixture()
def stub_llm(monkeypatch):
    calls = {"prompts": []}

    def fake_generate(prompt, **kwargs):
        calls["prompts"].append(prompt)
        return "Photosynthesis converts light energy into chemical energy."

    monkeypatch.setattr("app.services.rag_service.generate_text", fake_generate)
    return calls


def _upload_and_index(client, headers, ctx, name="biology.pdf", text=None):
    body = _pdf_bytes(text) if text else _pdf_bytes()
    response = client.post(
        "/ingest/",
        headers=headers,
        files={"file": (name, io.BytesIO(body), "application/pdf")},
    )
    assert response.status_code == 200, response.text
    document = response.json()["document"]

    from app.services.ingestion_service import ingest_document

    ingest_document(ctx, document["id"])
    return docs.get_document(ctx, document["id"])


def test_upload_indexes_and_reaches_ready(client, user_a):
    record = _upload_and_index(client, user_a["headers"], user_a["ctx"])
    assert record["status"] == "ready"
    assert record["pages"] >= 1
    assert record["chunk_count"] >= 1
    assert record["error"] is None
    assert docs.get_chunk_ids(record["id"]), "chunk ids must be recorded for deletion"
    assert faiss_store.index_size(user_a["ctx"].storage) == record["chunk_count"]


def test_answer_cites_the_source_document(client, user_a, stub_llm):
    _upload_and_index(client, user_a["headers"], user_a["ctx"], name="biology.pdf")

    response = client.post(
        "/qa/ask",
        headers=user_a["headers"],
        json={"question": "What does photosynthesis convert?", "marks": 3},
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["answer"]
    assert payload["sources"], "an answer must carry citations"
    first = payload["sources"][0]
    assert first["document_name"] == "biology.pdf"
    assert first["document_id"]
    assert first["page"] >= 1
    assert payload["session_id"], "the turn must be persisted"


def test_answer_is_written_to_chat_history(client, user_a, stub_llm):
    _upload_and_index(client, user_a["headers"], user_a["ctx"])
    ask = client.post(
        "/qa/ask",
        headers=user_a["headers"],
        json={"question": "What does photosynthesis convert?", "marks": 3},
    ).json()

    session = client.get(
        f"/chat-sessions/{ask['session_id']}", headers=user_a["headers"]
    ).json()
    roles = [m["role"] for m in session["messages"]]
    assert roles == ["user", "assistant"]
    assert session["messages"][1]["sources"][0]["document_name"] == "biology.pdf"


def test_stream_emits_real_stages_in_order(client, user_a, stub_llm):
    _upload_and_index(client, user_a["headers"], user_a["ctx"])

    with client.stream(
        "POST",
        "/qa/ask/stream",
        headers=user_a["headers"],
        json={"question": "What does photosynthesis convert?", "marks": 3},
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        import json

        events = [
            json.loads(line[6:])
            for line in response.iter_lines()
            if line.startswith("data: ")
        ]

    stages = [e["stage"] for e in events]
    assert stages == ["preparing", "retrieving", "analyzing", "generating",
                      "validating", "completed"]

    generating = next(e for e in events if e["stage"] == "generating")
    completed = next(e for e in events if e["stage"] == "completed")
    assert generating["passage_count"] == len(completed["result"]["sources"])
    assert generating["documents"] == ["biology.pdf"]
    assert completed["result"]["session_id"]


def test_delete_removes_only_that_documents_vectors(client, user_a):
    keep = _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="keep.pdf",
        text="Mitosis produces two identical daughter cells for growth.",
    )
    drop = _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="drop.pdf",
        text="Photosynthesis converts light energy into chemical energy.",
    )
    before = faiss_store.index_size(user_a["ctx"].storage)
    assert before == keep["chunk_count"] + drop["chunk_count"]

    assert client.delete(f"/ingest/{drop['id']}", headers=user_a["headers"]).status_code == 200

    after = faiss_store.index_size(user_a["ctx"].storage)
    assert after == keep["chunk_count"], "only the deleted document's vectors go"
    assert docs.get_document(user_a["ctx"], keep["id"])["status"] == "ready"


def test_duplicate_content_is_not_reindexed(client, user_a):
    _upload_and_index(client, user_a["headers"], user_a["ctx"], name="original.pdf")
    response = client.post(
        "/ingest/",
        headers=user_a["headers"],
        files={"file": ("copy.pdf", io.BytesIO(_pdf_bytes()), "application/pdf")},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "duplicate"
    assert len(docs.list_documents(user_a["ctx"])) == 1


def test_selecting_one_document_never_returns_another(client, user_a, stub_llm):
    bio = _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="biology.pdf",
        text="Photosynthesis converts light energy into chemical energy.",
    )
    _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="history.pdf",
        text="The French Revolution began in seventeen eighty nine in Paris.",
    )

    payload = client.post(
        "/qa/ask",
        headers=user_a["headers"],
        json={
            "question": "When did the revolution begin?",
            "marks": 3,
            "document_ids": [bio["id"]],
        },
    ).json()

    names = {s["document_name"] for s in payload["sources"]}
    assert names == {"biology.pdf"}, f"selection leaked: {names}"


def test_failed_document_can_be_retried(client, user_a):
    record = docs.create_document(
        user_a["ctx"], original_name="missing.pdf", stored_name="missing.pdf",
        byte_size=1, content_hash=None,
    )
    from app.services.ingestion_service import IngestionError, ingest_document

    with pytest.raises(IngestionError):
        ingest_document(user_a["ctx"], record["id"])

    failed = docs.get_document(user_a["ctx"], record["id"])
    assert failed["status"] == "failed"
    assert failed["error"], "a failure must explain itself"

    response = client.post(f"/ingest/{record['id']}/retry", headers=user_a["headers"])
    assert response.status_code == 200
    assert response.json()["document"]["status"] in ("queued", "parsing", "failed")


def test_reset_clears_index_and_documents(client, user_a):
    _upload_and_index(client, user_a["headers"], user_a["ctx"])
    assert faiss_store.index_size(user_a["ctx"].storage) > 0

    assert client.delete("/ingest/reset", headers=user_a["headers"]).status_code == 200
    assert docs.list_documents(user_a["ctx"]) == []
    assert faiss_store.index_size(user_a["ctx"].storage) == 0
