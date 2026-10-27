import json
import math
import sys

import pytest
from google.api_core import exceptions as google_exceptions

from app.core.config import settings
from app.services import document_service as docs
from app.services.ingestion_service import ingest_document
from app.services.rag_service import _semantic_score
from app.vectorstore import faiss_store
from app.vectorstore.embeddings import EmbeddingServiceError, GeminiEmbeddings, build_embeddings
from tests.test_pipeline import _upload_and_index

pytestmark = pytest.mark.usefixtures("inline_ingest")


class FakeEmbedContent:

    def __init__(self, failures=()):
        self.calls = []
        self.failures = list(failures)

    def __call__(self, model, content, task_type=None, output_dimensionality=None, **kwargs):
        self.calls.append(
            {"model": model, "count": len(content), "task_type": task_type,
             "dims": output_dimensionality}
        )
        if self.failures:
            raise self.failures.pop(0)
        return {"embedding": [[3.0, 4.0] + [0.0] * (output_dimensionality - 2) for _ in content]}


@pytest.fixture()
def fake_embed(monkeypatch):
    def install(failures=()):
        fake = FakeEmbedContent(failures)
        monkeypatch.setattr("google.generativeai.embed_content", fake)
        monkeypatch.setattr("google.generativeai.configure", lambda **kwargs: None)
        return fake

    return install


def _gemini(**kwargs):
    embeddings = GeminiEmbeddings(model="gemini-embedding-001", dimensions=768, api_key="k", **kwargs)
    embeddings.delays = []
    embeddings._sleep = embeddings.delays.append
    return embeddings


def test_documents_are_batched_normalised_and_typed(fake_embed):
    fake = fake_embed()
    vectors = _gemini().embed_documents([f"chunk {i}" for i in range(250)])

    assert [c["count"] for c in fake.calls] == [100, 100, 50]
    assert {c["task_type"] for c in fake.calls} == {"RETRIEVAL_DOCUMENT"}
    assert {c["dims"] for c in fake.calls} == {768}
    assert {c["model"] for c in fake.calls} == {"models/gemini-embedding-001"}
    assert len(vectors) == 250
    assert all(len(v) == 768 for v in vectors)
    assert all(math.isclose(math.sqrt(sum(x * x for x in v)), 1.0) for v in vectors)
    assert vectors[0][:2] == pytest.approx([0.6, 0.8])


def test_query_uses_retrieval_query_task(fake_embed):
    fake = fake_embed()
    vector = _gemini().embed_query("what is osmosis?")

    assert fake.calls == [
        {"model": "models/gemini-embedding-001", "count": 1,
         "task_type": "RETRIEVAL_QUERY", "dims": 768}
    ]
    assert math.isclose(math.sqrt(sum(x * x for x in vector)), 1.0)


def test_rate_limit_is_retried_with_backoff(fake_embed):
    fake = fake_embed([
        google_exceptions.ResourceExhausted("429 Resource has been exhausted"),
        google_exceptions.ServiceUnavailable("503 overloaded"),
    ])
    embeddings = _gemini()

    assert len(embeddings.embed_documents(["a", "b"])) == 2
    assert len(fake.calls) == 3
    assert embeddings.delays == [2.0, 4.0]


def test_rate_limit_gives_up_after_capped_attempts(fake_embed):
    fake = fake_embed([google_exceptions.ResourceExhausted("429 quota")] * 10)
    embeddings = _gemini(max_attempts=4, max_delay=5.0)

    with pytest.raises(EmbeddingServiceError, match="after 4 attempts"):
        embeddings.embed_documents(["a"])
    assert len(fake.calls) == 4
    assert embeddings.delays == [2.0, 4.0, 5.0]


def test_client_errors_are_not_retried(fake_embed):
    fake = fake_embed([google_exceptions.InvalidArgument("400 API key not valid")])
    embeddings = _gemini()

    with pytest.raises(EmbeddingServiceError, match="API key not valid"):
        embeddings.embed_query("a")
    assert len(fake.calls) == 1
    assert embeddings.delays == []


def test_gemini_provider_is_built_without_local_model_packages():
    embeddings = build_embeddings()
    assert isinstance(embeddings, GeminiEmbeddings)
    assert embeddings.dimensions == settings.EMBEDDING_DIMENSIONS
    assert "langchain_huggingface" not in sys.modules


def test_semantic_score_converts_squared_l2_to_cosine():
    assert _semantic_score(0.0) == 1.0
    assert _semantic_score(0.8) == pytest.approx(0.6)
    assert _semantic_score(2.0) == 0.0


def test_saved_index_records_its_embedding_signature(client, user_a):
    _upload_and_index(client, user_a["headers"], user_a["ctx"])
    meta = json.loads((user_a["ctx"].storage.index_dir / "embedding.json").read_text())
    assert meta == {
        "provider": "gemini",
        "model": settings.GEMINI_EMBEDDING_MODEL,
        "dimensions": settings.EMBEDDING_DIMENSIONS,
    }


@pytest.mark.parametrize("setting, value", [
    ("GEMINI_EMBEDDING_MODEL", "text-embedding-004"),
    ("EMBEDDING_DIMENSIONS", 1536),
    ("EMBEDDING_PROVIDER", "local"),
])
def test_index_with_other_embeddings_is_rejected(client, user_a, monkeypatch, setting, value):
    storage = user_a["ctx"].storage
    _upload_and_index(client, user_a["headers"], user_a["ctx"])
    faiss_store.invalidate(storage.user_id)
    monkeypatch.setattr(settings, setting, value)

    with pytest.raises(faiss_store.IncompatibleIndexError):
        faiss_store.load_index(storage)


def test_index_without_metadata_is_rejected(client, user_a):
    storage = user_a["ctx"].storage
    _upload_and_index(client, user_a["headers"], user_a["ctx"])
    (storage.index_dir / "embedding.json").unlink()
    faiss_store.invalidate(storage.user_id)

    with pytest.raises(faiss_store.IncompatibleIndexError):
        faiss_store.load_index(storage)


def test_stale_index_fails_the_question_and_flags_documents(client, user_a):
    storage = user_a["ctx"].storage
    record = _upload_and_index(client, user_a["headers"], user_a["ctx"])
    (storage.index_dir / "embedding.json").unlink()
    faiss_store.invalidate(storage.user_id)

    response = client.post(
        "/qa/ask",
        headers=user_a["headers"],
        json={"question": "What does photosynthesis convert?", "marks": 3},
    )
    assert response.status_code == 400
    assert "re-index" in response.json()["detail"]

    flagged = docs.get_document(user_a["ctx"], record["id"])
    assert flagged["status"] == "failed"
    assert flagged["error"] == docs.REINDEX_REQUIRED_ERROR

    ingest_document(user_a["ctx"], record["id"])
    assert docs.get_document(user_a["ctx"], record["id"])["status"] == "ready"
    assert faiss_store.index_size(storage) == flagged["chunk_count"]


def test_ingesting_into_stale_index_rebuilds_it(client, user_a):
    storage = user_a["ctx"].storage
    old = _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="old.pdf",
        text="Mitosis produces two identical daughter cells.",
    )
    (storage.index_dir / "embedding.json").write_text(
        json.dumps({"provider": "local", "model": "all-MiniLM-L6-v2", "dimensions": 384})
    )
    faiss_store.invalidate(storage.user_id)

    new = _upload_and_index(
        client, user_a["headers"], user_a["ctx"], name="new.pdf",
        text="Photosynthesis converts light energy into chemical energy.",
    )

    assert new["status"] == "ready"
    assert faiss_store.index_size(storage) == new["chunk_count"]
    flagged = docs.get_document(user_a["ctx"], old["id"])
    assert flagged["status"] == "failed"
    assert flagged["error"] == docs.REINDEX_REQUIRED_ERROR
