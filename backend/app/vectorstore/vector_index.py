import json
from pathlib import Path

import faiss
import numpy as np
from langchain_core.documents import Document

INDEX_FILE = "index.faiss"
DOCSTORE_FILE = "docstore.json"


class VectorIndex:
    def __init__(self, embeddings, dimensions: int, index=None, records=None, next_id: int = 0):
        self.embeddings = embeddings
        self.index = index if index is not None else faiss.IndexIDMap2(faiss.IndexFlatL2(dimensions))
        self.records: dict[str, dict] = records or {}
        self.next_id = next_id
        self._by_int = {record["id"]: chunk_id for chunk_id, record in self.records.items()}

    @property
    def dimensions(self) -> int:
        return self.index.d

    def __len__(self) -> int:
        return len(self.records)

    def __contains__(self, chunk_id: str) -> bool:
        return chunk_id in self.records

    @classmethod
    def from_documents(cls, documents: list[Document], embeddings, ids: list[str]) -> "VectorIndex":
        vectors = _as_matrix(embeddings.embed_documents([d.page_content for d in documents]))
        store = cls(embeddings, vectors.shape[1])
        store._add(documents, ids, vectors)
        return store

    def add_documents(self, documents: list[Document], ids: list[str]) -> int:
        fresh = [(d, i) for d, i in zip(documents, ids) if i not in self.records]
        if not fresh:
            return 0
        vectors = _as_matrix(self.embeddings.embed_documents([d.page_content for d, _ in fresh]))
        self._add([d for d, _ in fresh], [i for _, i in fresh], vectors)
        return len(fresh)

    def _add(self, documents, ids, vectors) -> None:
        if vectors.shape[1] != self.index.d:
            raise ValueError(f"Embedding dimension {vectors.shape[1]} != index dimension {self.index.d}")
        int_ids = np.arange(self.next_id, self.next_id + len(ids), dtype=np.int64)
        self.index.add_with_ids(vectors, int_ids)
        for doc, chunk_id, int_id in zip(documents, ids, int_ids.tolist()):
            self.records[chunk_id] = {"id": int_id, "text": doc.page_content, "metadata": dict(doc.metadata)}
            self._by_int[int_id] = chunk_id
        self.next_id += len(ids)

    def delete(self, chunk_ids: list[str]) -> int:
        present = [c for c in chunk_ids if c in self.records]
        if not present:
            return 0
        int_ids = np.array([self.records[c]["id"] for c in present], dtype=np.int64)
        self.index.remove_ids(int_ids)
        for chunk_id in present:
            self._by_int.pop(self.records.pop(chunk_id)["id"], None)
        return len(present)

    def similarity_search_with_score(self, query: str, k: int = 4, filter=None) -> list[tuple[Document, float]]:
        total = self.index.ntotal
        if total == 0:
            return []
        vector = _as_matrix([self.embeddings.embed_query(query)])
        distances, int_ids = self.index.search(vector, total if filter else min(k, total))
        results = []
        for distance, int_id in zip(distances[0].tolist(), int_ids[0].tolist()):
            chunk_id = self._by_int.get(int_id)
            if chunk_id is None:
                continue
            record = self.records[chunk_id]
            if filter is not None and not filter(record["metadata"]):
                continue
            results.append((Document(page_content=record["text"], metadata=dict(record["metadata"])), float(distance)))
            if len(results) >= k:
                break
        return results

    def save(self, directory: Path) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(directory / INDEX_FILE))
        payload = {"next_id": self.next_id, "records": self.records}
        (directory / DOCSTORE_FILE).write_text(json.dumps(payload), encoding="utf-8")

    @classmethod
    def load(cls, directory: Path, embeddings) -> "VectorIndex":
        index = faiss.read_index(str(directory / INDEX_FILE))
        payload = json.loads((directory / DOCSTORE_FILE).read_text(encoding="utf-8"))
        return cls(embeddings, index.d, index=index, records=payload["records"], next_id=payload["next_id"])


def _as_matrix(vectors) -> np.ndarray:
    return np.ascontiguousarray(np.asarray(vectors, dtype=np.float32))
