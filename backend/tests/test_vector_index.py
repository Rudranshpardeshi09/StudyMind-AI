import httpx
import pytest
from langchain_core.documents import Document

from app.services import gemini_api
from app.services.gemini_api import GeminiAPIError
from app.services.rag_service import _semantic_score
from app.vectorstore import faiss_store
from app.vectorstore.vector_index import VectorIndex


class AxisEmbeddings:
    vocab = ["alpha", "beta", "gamma", "delta"]

    def _vector(self, text):
        return [1.0 if word in text else 0.0 for word in self.vocab]

    def embed_documents(self, texts):
        return [self._vector(t) for t in texts]

    def embed_query(self, text):
        return self._vector(text)


def _docs(*pairs):
    return [Document(page_content=text, metadata={"document_id": doc_id, "page": 1}) for text, doc_id in pairs]


def _store():
    return VectorIndex.from_documents(
        _docs(("alpha", "d1"), ("beta", "d1"), ("gamma", "d2")), AxisEmbeddings(), ids=["a", "b", "c"]
    )


def test_search_returns_nearest_with_cosine_compatible_score():
    doc, score = _store().similarity_search_with_score("alpha", k=1)[0]
    assert doc.page_content == "alpha"
    assert _semantic_score(score) == pytest.approx(1.0)

    _, other = _store().similarity_search_with_score("alpha", k=2)[1]
    assert _semantic_score(other) == pytest.approx(0.0)


def test_filter_restricts_results():
    results = _store().similarity_search_with_score("alpha", k=3, filter=lambda m: m["document_id"] == "d2")
    assert [d.page_content for d, _ in results] == ["gamma"]


def test_delete_and_add_skip_known_ids():
    store = _store()
    assert store.delete(["a", "missing"]) == 1
    assert "a" not in store and len(store) == 2
    assert all(d.page_content != "alpha" for d, _ in store.similarity_search_with_score("alpha", k=3))
    assert store.add_documents(_docs(("beta", "d1"), ("delta", "d3")), ["b", "d"]) == 1
    assert store.similarity_search_with_score("delta", k=1)[0][0].page_content == "delta"


def test_save_and_load_round_trip(tmp_path):
    store = _store()
    store.delete(["b"])
    store.save(tmp_path)

    loaded = VectorIndex.load(tmp_path, AxisEmbeddings())
    assert len(loaded) == 2 and loaded.dimensions == 4
    assert loaded.similarity_search_with_score("gamma", k=1)[0][0].metadata == {"document_id": "d2", "page": 1}
    loaded.add_documents(_docs(("delta", "d3")), ["d"])
    assert loaded.similarity_search_with_score("delta", k=1)[0][0].page_content == "delta"


def test_legacy_pickle_index_is_incompatible(user_a):
    storage = user_a["ctx"].storage
    storage.index_dir.mkdir(parents=True, exist_ok=True)
    (storage.index_dir / "index.faiss").write_bytes(b"old")
    (storage.index_dir / "index.pkl").write_bytes(b"old")
    faiss_store.invalidate(storage.user_id)

    with pytest.raises(faiss_store.IncompatibleIndexError):
        faiss_store.load_index(storage)


def _respond(monkeypatch, status, payload):
    def fake(method, url, **kwargs):
        fake.calls.append((method, url, kwargs))
        return httpx.Response(status, json=payload)

    fake.calls = []
    monkeypatch.setattr(gemini_api.httpx, "request", fake)
    return fake


def test_batch_embed_builds_request_and_reads_values(monkeypatch):
    fake = _respond(monkeypatch, 200, {"embeddings": [{"values": [1.0, 2.0]}, {"values": [3.0, 4.0]}]})
    vectors = gemini_api.batch_embed("gemini-embedding-001", ["a", "b"], "RETRIEVAL_DOCUMENT", 2, api_key="k")

    assert vectors == [[1.0, 2.0], [3.0, 4.0]]
    method, url, kwargs = fake.calls[0]
    assert url.endswith("/models/gemini-embedding-001:batchEmbedContents")
    assert kwargs["headers"] == {"x-goog-api-key": "k"}
    first = kwargs["json"]["requests"][0]
    assert first["taskType"] == "RETRIEVAL_DOCUMENT" and first["outputDimensionality"] == 2


def test_api_errors_carry_status_and_message(monkeypatch):
    _respond(monkeypatch, 429, {"error": {"message": "Quota exceeded. Please retry in 7s."}})
    with pytest.raises(GeminiAPIError) as info:
        gemini_api.batch_embed("m", ["a"], "RETRIEVAL_QUERY", 2, api_key="k")
    assert info.value.code == 429
    assert "retry in 7s" in str(info.value)


def test_response_text_skips_thought_parts():
    response = {"candidates": [{"content": {"parts": [{"text": "plan", "thought": True}, {"text": "Answer"}]}, "finishReason": "STOP"}]}
    assert gemini_api.response_text(response) == "Answer"
    assert gemini_api.finish_reason(response) == "STOP"
    assert gemini_api.response_text({"candidates": []}) == ""


def test_retry_delay_parses_hours_minutes_and_seconds():
    from app.services.gemini_llm import _extract_retry_delay_seconds

    assert _extract_retry_delay_seconds(Exception("Please retry in 11h29m5s.")) == 41345
    assert _extract_retry_delay_seconds(Exception("Please retry in 2m3.5s.")) == 123.5
    assert _extract_retry_delay_seconds(Exception("Please retry in 7s.")) == 7
    assert _extract_retry_delay_seconds(Exception("busy")) == 60


def test_non_text_models_are_not_candidates():
    from app.services.gemini_llm import _is_text_model

    assert _is_text_model("models/gemini-2.5-flash")
    assert not _is_text_model("models/gemini-2.5-flash-image")
    assert not _is_text_model("models/gemini-2.5-flash-preview-tts")
