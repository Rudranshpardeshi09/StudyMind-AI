# StudyMind AI

StudyMind AI is a study assistant built on Retrieval-Augmented Generation (RAG). You upload course material (PDF or DOCX) and ask questions about it. The app finds the most relevant passages in your documents and asks Google Gemini to answer from them. Each answer lists the passages it was given, with the document name and page number.

## Features

- Upload several PDF or DOCX files and ask questions across all of them or a selected few
- Answers cite the document and page of each retrieved passage
- Choose the answer length: 3, 5 or 12 marks
- Follow-up questions use the earlier conversation
- The answer streams in, with the current pipeline step shown while it works
- Mind maps generated from a whole document, a chapter or a topic, with PNG, PDF and JSON export
- Accounts with email and password (and optional Google sign-in); each user's documents, chats and mind maps are private

## How it works

1. **Ingestion:** files are parsed page by page and split into overlapping chunks (900 characters with 150 overlap, using LangChain). Each chunk is embedded with the Gemini embedding API (`gemini-embedding-001`, 768 dimensions) and stored in a FAISS index belonging to that user, with its document id and page number. A local `all-MiniLM-L6-v2` model can be used instead (see below).
2. **Retrieval:** a question is embedded and searched against the index. The candidates are re-ranked using semantic similarity plus keyword overlap.
3. **Generation:** the top passages go to Gemini with instructions to answer only from them. The API returns the answer together with its citations.

## Tech stack

- **Backend:** Python, FastAPI, LangChain, FAISS, Google Gemini API (answers and embeddings), SQLite; optional sentence-transformers for local embeddings
- **Frontend:** React, Vite, Tailwind CSS, React Flow

## Run locally

You need Python 3.11+, Node.js 18+ and a [Gemini API key](https://aistudio.google.com/app/apikey).

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy env.example .env            # macOS/Linux: cp env.example .env
```

Open `backend/.env` and set `GEMINI_API_KEY`. Then start the server:

```bash
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs.

To embed locally with `all-MiniLM-L6-v2` instead of the Gemini API (this installs PyTorch), run `pip install -r requirements-local.txt` and set `EMBEDDING_PROVIDER=local` in `.env`. Indexes are tied to the embedding model that built them: after switching provider, retry or re-upload your documents to rebuild the index.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
copy .env.example .env           # macOS/Linux: cp .env.example .env
npm run dev
```

Open http://localhost:5173.

### Tests

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest
cd frontend && npm test
```
