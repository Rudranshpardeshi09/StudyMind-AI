# StudyMind AI

Upload your course material and ask questions about it. Answers are generated
only from your own documents and every one cites the document, page and passage
it came from, so you can check the source rather than trust the model.

- **RAG Q&A** with verifiable citations and answer-length control
- **Streamed generation stages** — the UI shows what the server is actually doing
- **Mind maps** from a document, a chapter, or a single topic
- **Per-user isolation** — documents, indexes, chats and maps are private to an account

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 7, Tailwind, Radix UI, Framer Motion, React Flow |
| Backend | FastAPI, Pydantic v2, SQLite |
| Retrieval | LangChain, FAISS, HuggingFace `all-MiniLM-L6-v2` |
| Generation | Google Gemini |
| Tests | pytest + httpx, Vitest + Testing Library |

---

## Running it locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

cp env.example .env             # then set GEMINI_API_KEY
uvicorn app.main:app --reload
```

Serves on `http://localhost:8000`; interactive docs at `/docs` in development.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Serves on `http://localhost:5173`.

### Tests

```bash
cd backend  && venv/Scripts/python.exe -m pytest      # 59 tests
cd frontend && npm test                               # 41 tests
```

---

## Configuration

Every setting is an environment variable; see `backend/env.example` for the full
list. The ones that matter most:

| Variable | Notes |
|----------|-------|
| `GEMINI_API_KEY` | Required. Answers cannot be generated without it. |
| `JWT_SECRET` | **Required in production** and must be ≥32 characters. The server refuses to start without it. In development a local secret is generated for you. |
| `DATA_DIR` | Where SQLite, uploads and per-user FAISS indexes live. Must point at persistent storage in production. |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins. |
| `AUTH_RATE_LIMIT_PER_MINUTE` | Per-IP limit on `/auth/*`. Defaults to 10. |
| `EXPOSE_DOCS` | Interactive docs are closed in production unless this is set. |

---

## Architecture

```
API layer        routers + Pydantic schemas
                 Depends(get_user_context) -> UserContext(user_id, storage)
                      |
Application      DocumentService · rag_service · mindmap_service · chat_history
                 every call takes UserContext first
                      |
Retrieval        scored similarity search, metadata-filtered by document
                      |
Vector store     one FAISS index per user, bounded LRU + per-user lock
                      |
Persistence      SQLite (users, documents, chunks, chat, mind_maps)
                 DATA_DIR/users/<id>/{uploads,index}
```

Two seams carry identity and storage so that an unscoped query is a call-site
error rather than something review has to catch:

- **`UserContext`** — resolved once by the auth dependency, passed as the first
  argument of every service function.
- **`UserStorage`** — the only thing that turns a user id and a name into a path,
  with containment checking built in.

### Data model

| Table | Purpose |
|-------|---------|
| `users` | Email/password and Google accounts |
| `documents` | One row per upload: status, pages, chunk count, content hash |
| `document_chunks` | Chunk ids per document — enables incremental index deletion |
| `chat_sessions` / `chat_messages` | Saved conversations with their citations |
| `mind_maps` | Generated maps |
| `user_preferences` | Per-account defaults |

Schema changes go through the append-only `MIGRATIONS` list in
`app/db/auth_db.py` and are applied on startup.

---

## Document lifecycle

```
queued -> parsing -> embedding -> ready
   |         |           |
   +---------+-----------+------> failed -> retry -> queued
```

Every transition is persisted on the document row. Status is never inferred from
whether a file or directory happens to exist, so it survives a restart.

Deleting one document removes only its own vectors, by recorded chunk id — the
rest of the library is not re-parsed or re-embedded. Uploading identical content
is detected by SHA-256 and skipped rather than indexed twice.

---

## Answer generation

`POST /qa/ask` returns JSON. `POST /qa/ask/stream` returns Server-Sent Events
carrying the pipeline's real stages:

```
preparing -> retrieving -> analyzing -> generating -> validating -> completed
```

Both endpoints drain the same generator, so there is one pipeline and the two
cannot drift apart.

**Progress is never faked.** A stage is emitted only after the work it names has
completed, and counts shown in the UI (`Found 6 relevant passages`) come from the
pipeline rather than a template. There is no percentage anywhere, because the
backend has no measurable one to report. Upload progress *is* determinate, since
bytes transferred is a real quantity.

---

## Deployment

### Backend (Render)

`backend/render.yaml` is a working blueprint. Two things it must have:

- `rootDir: backend` — the app package is not importable from the repo root.
- A **persistent disk** mounted at `DATA_DIR`. Without one, every deploy destroys
  all accounts, documents, chats and mind maps.

`sentence-transformers` pulls PyTorch, which sets the hosting floor: a 512MB
instance will OOM. Either provision ≥2GB with a single worker, or swap
`EMBEDDING_MODEL` for a hosted embedding API.

### Frontend (Vercel)

`frontend/vercel.json` already rewrites all paths to `index.html`, which is what
client-side routing needs. Set `VITE_API_URL` to the backend URL.

---

## Security notes

- Passwords are bcrypt-hashed; Google sign-in verifies the ID token server-side
  against a server-held client id.
- Every route resolves documents, chats and maps by id **scoped to the caller**.
  `tests/test_tenancy.py` asserts this across every route and runs in CI.
- Uploads are validated by extension and streamed with a size cap; syllabus files
  are additionally checked by magic bytes, not the declared content type.
- `backend/app/data/` is gitignored in full, including the development JWT secret.

### Known limitations

- Access tokens are long-lived and stored in `localStorage`; there is no refresh
  rotation or server-side revocation yet, so logging out clears the client only.
- Rate limiting is in-process. It must move to Redis if the service is ever run
  with more than one worker.
- Chapter/topic mind maps read the first 24,000 characters of a document to
  derive its outline, so very long books may produce a coarse chapter list.

---

## License

MIT
