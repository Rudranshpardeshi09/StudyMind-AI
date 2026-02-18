# 📚 StudyMind AI: Intelligent PDF Learning Assistant

<div align="center">

![StudyMind AI Banner](https://img.shields.io/badge/StudyMind%20AI-RAG%20Learning%20Platform-000?style=for-the-badge&logo=book)

**Transform your study materials into an intelligent AI tutor powered by RAG**

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![LangChain](https://img.shields.io/badge/LangChain-RAG%20Orchestration-black.svg?style=flat-square&logo=chain-link)](https://www.langchain.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%20API-orange.svg?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector%20Search-purple.svg?style=flat-square)](https://faiss.ai/)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)

[🚀 Live Demo](#-quick-start-guide) • [📖 Documentation](#-getting-started) • [🤝 Contributing](#-contributing) • [🐛 Report Bug](../../issues)

</div>

---

## 🎯 What is StudyMind AI?

StudyMind AI is a **next-generation Retrieval-Augmented Generation (RAG)** application that revolutionizes the way students study. Upload your textbooks, lecture notes, and study guides, then interact with an intelligent AI tutor that answers questions with **precise citations** directly from your documents.

No hallucinations. No made-up information. Just factual, verified answers backed by page numbers and text snippets from your own materials.

Perfect for:
- 🎓 **Exam Preparation** - Generate answers in exam formats (3-mark, 5-mark, 12-mark)
- 📖 **Self-Study** - Ask unlimited questions about your course materials
- 🔍 **Fact Verification** - Cross-verify answers with instant source attribution
- 📱 **Learning On-The-Go** - Fully responsive design works on all devices

---

## ✨ Key Features

### 🧠 Intelligent RAG Pipeline
- **LangChain + Google Gemini** integration for context-aware, factually grounded answers
- **Semantic search** using HuggingFace embeddings for relevance ranking
- Smart prompt engineering tailored for academic responses

### 📑 Multi-PDF Knowledge Base
- Upload **multiple PDFs simultaneously** (up to 50MB each)
- Process textbooks, lecture notes, and study guides in one unified system
- Automatic FAISS indexing for instant semantic search

### 🎯 Exam-Focused Answers
- **3-Mark Answers** - Concise, punchy responses
- **5-Mark Answers** - Moderate depth with examples
- **12-Mark Answers** - Comprehensive, detailed explanations
- Tailor answer length to your exam requirements

### 🔍 Precise Source Attribution
Every answer includes:
- ✅ **Exact page numbers** from your PDFs
- ✅ **Text snippets** showing the source content
- ✅ **Clickable source cards** for instant reference
- Never doubt the origin of an answer again

### 🎨 Beautiful, Modern UI
- ✨ **Smooth animations** powered by Framer Motion
- 📱 **Fully responsive** - Desktop, tablet, and mobile optimized
- 🌙 **Dark/Light mode** with custom neon green theme accents
- 🎯 Intuitive chat interface with real-time typing indicators

### 💾 Document Management
- Delete individual PDFs without rebuilding entire index
- Reset everything with one click
- Real-time upload status tracking
- Support for PDF and DOCX formats

### 📚 Syllabus Context Mode
- Upload or paste your syllabus for curriculum-aligned answers
- AI adjusts responses based on your course scope
- Never answer questions outside your curriculum

### 💬 Smart Chat Memory
- Maintains 15-message conversation history
- Context-aware follow-up questions
- Remembers your study goals and preferences

---

## ⚙️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Radix UI, Lucide Icons |
| **Backend** | Python 3.9+, FastAPI, Uvicorn, Pydantic |
| **AI/ML** | LangChain, Google Gemini API, HuggingFace Sentence-Transformers |
| **Vector DB** | FAISS (Facebook AI Similarity Search) |
| **Document Processing** | PyPDF2, PyPDFPlumber, python-docx |
| **Styling** | Tailwind CSS 3.4, CSS Variables for theming |
| **HTTP Client** | Axios |
| **State Management** | React Context API |

---

## 🚀 Getting Started

### 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Google Gemini API Key** - [Get one free](https://ai.google.dev/)
- **Git** - [Download](https://git-scm.com/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/pdf_qa_rag.git
cd pdf_qa_rag
```

### 2️⃣ Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment Variables
Create a `.env` file in the `backend` directory:

```env
# 🔐 Required
GOOGLE_API_KEY=your_gemini_api_key_here

# 📁 Storage Paths
VECTOR_DB_PATH=app/data/vector_db
UPLOAD_DIR=app/data/uploaded_pdfs

# 🌐 CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173

# ⚙️ Optional (Defaults provided)
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K=8
MAX_CHAT_HISTORY=10
REQUEST_TIMEOUT=30
RATE_LIMIT_PER_MINUTE=60
```

#### Start Backend Server
```bash
uvicorn app.main:app --reload
```

✅ Backend runs on: `http://localhost:8000`
📚 API Docs: `http://localhost:8000/docs`

### 3️⃣ Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Start Development Server
```bash
npm run dev
```

✅ Frontend runs on: `http://localhost:5173`

Now open your browser and navigate to **`http://localhost:5173`** to start using StudyMind AI! 🎉

---

## 📁 Project Structure

```
pdf_qa_rag/
│
├── backend/                          # 🔧 FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── ingest.py        # PDF upload, delete, reset endpoints
│   │   │   │   ├── qa.py            # Question-answer endpoint
│   │   │   │   ├── syllabus.py      # Syllabus context endpoint
│   │   │   │   └── __init__.py
│   │   │   ├── schemas/             # Pydantic request/response models
│   │   │   │   ├── ingest.py
│   │   │   │   ├── qa.py
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py            # Settings & environment variables
│   │   │   ├── logging.py           # Centralized logging config
│   │   │   └── __init__.py
│   │   │
│   │   ├── services/
│   │   │   ├── ingestion_service.py # PDF processing & chunk creation
│   │   │   ├── rag_service.py       # Core RAG pipeline
│   │   │   ├── gemini_llm.py        # Google Gemini API wrapper
│   │   │   ├── llm_service.py       # LLM orchestration
│   │   │   ├── syllabus_service.py  # Syllabus context management
│   │   │   └── __init__.py
│   │   │
│   │   ├── rag/
│   │   │   ├── chunking.py          # Text splitting & preprocessing
│   │   │   ├── memory.py            # Chat history management
│   │   │   ├── prompts.py           # RAG prompt templates
│   │   │   ├── retriever.py         # Semantic search retriever
│   │   │   └── __init__.py
│   │   │
│   │   ├── vectorstore/
│   │   │   └── faiss_store.py       # FAISS vector database management
│   │   │
│   │   ├── data/
│   │   │   ├── uploads/             # Temporary upload processing
│   │   │   ├── uploaded_pdfs/       # Persisted original PDFs
│   │   │   └── vector_db/           # FAISS indices
│   │   │
│   │   ├── utils/                   # Helper utilities
│   │   └── main.py                  # FastAPI app initialization
│   │
│   ├── .env                         # Environment variables (create this)
│   ├── requirements.txt             # Python dependencies
│   └── README_BACKEND.md            # Backend-specific docs
│
├── frontend/                         # ⚛️ React Vite Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            # Axios API client with interceptors
│   │   │
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInput.jsx    # Message input box with file attach
│   │   │   │   ├── ChatWindow.jsx   # Messages display area
│   │   │   │   ├── MessageBubble.jsx# Individual message UI
│   │   │   │   ├── MobileChatDrawer.jsx # Mobile chat interface
│   │   │   │   └── SourcesPanel.jsx # Citation/source display
│   │   │   │
│   │   │   ├── upload/
│   │   │   │   └── UploadPDF.jsx    # Drag-drop PDF upload
│   │   │   │
│   │   │   ├── study/
│   │   │   │   └── StudyPanel.jsx   # Marks & syllabus settings
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx    # Main layout wrapper
│   │   │   │   ├── Navigation.jsx   # Top navigation bar
│   │   │   │   ├── Footer.jsx       # Footer section
│   │   │   │   └── ThemeToggle.jsx  # Dark/light mode switcher
│   │   │   │
│   │   │   └── ui/                  # Radix UI components
│   │   │
│   │   ├── context/
│   │   │   ├── AppContext.jsx       # Global app state (PDFs, messages)
│   │   │   └── ThemeContext.jsx     # Theme state management
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Main study interface
│   │   │   ├── Tutorial.jsx         # Features & how-to guide
│   │   │   └── NotFound.jsx         # 404 page
│   │   │
│   │   ├── lib/
│   │   │   └── utils.js             # Utility functions
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css          # Global styles & animations
│   │   │
│   │   ├── App.jsx                  # Root component
│   │   └── main.jsx                 # React entry point
│   │
│   ├── public/                      # Static assets (images, icons)
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # JavaScript dependencies
│   ├── vite.config.js               # Vite build configuration
│   ├── tailwind.config.js           # Tailwind CSS theme config
│   ├── jsconfig.json                # Path aliases
│   ├── postcss.config.js            # PostCSS configuration
│   └── components.json              # Component library meta
│
└── README.md                         # This file!
```

---

## 🎯 API Endpoints

### 📤 Ingestion Endpoints (`/ingest`)

```http
POST /ingest/
```
Upload PDF file(s) for processing
- **Request**: Multipart form data with PDF file
- **Response**: `{status: "processing", filename: "...", ...}`

```http
GET /ingest/status
```
Check upload processing status

```http
DELETE /ingest/delete/{filename}
```
Remove specific PDF from knowledge base

```http
DELETE /ingest/reset
```
Clear all PDFs and rebuild vectorstore

### ❓ Question-Answer Endpoint (`/qa`)

```http
POST /qa/ask
```
Submit question and receive AI answer with citations
```json
{
  "question": "What is photosynthesis?",
  "marks": 5,
  "include_syllabus": true
}
```
**Response**:
```json
{
  "answer": "Detailed answer...",
  "sources": [
    {
      "filename": "biology.pdf",
      "page": 42,
      "text_snippet": "..."
    }
  ],
  "citations": ["Page 42", "Page 45"]
}
```

### 📚 Syllabus Endpoint (`/syllabus`)

```http
POST /syllabus/upload
```
Upload/update syllabus context for curriculum-aligned answers

---

## 💡 Use Cases & Examples

### 📖 Case 1: Exam Preparation
```
User uploads: Chemistry_Notes.pdf, Practice_Problems.pdf
Query: "Explain Le Chatelier's Principle (5 marks)"
Result: AI provides a structured 5-mark answer with exact
         citations to the textbook
```

### 🔍 Case 2: Concept Clarification
```
User uploads: Physics_Textbook.pdf
Query: "I don't understand quantum superposition. Can you explain simply?"
Result: Simple, beginner-friendly explanation with visual metaphors
         + citations from textbook
```

### 📚 Case 3: Quick Summarization
```
User uploads: 200-page History_Book.pdf
Query: "Summarize the French Revolution in 3 marks"
Result: Concise summary focusing on key events and dates
```

### ✅ Case 4: Answer Verification
```
User answers question manually, then:
Query: "Is my answer about mitosis correct? Here's my answer: ..."
Result: AI checks against your study materials and provides feedback
```

---

## 🔑 Why Google Gemini?

StudyMind AI leverages **Google Gemini Pro**, a cutting-edge multimodal LLM, because it:

✅ **Understands Context** - Deeply comprehends academic text and nuance
✅ **Accurate Citations** - Enables precise RAG-driven fact grounding
✅ **Fast Responses** - Sub-second latency for seamless user experience
✅ **Cost-Effective** - Generous free tier for students and researchers
✅ **Multimodal** - Future-ready for image and document understanding
✅ **Reliable** - Backed by Google's infrastructure and safety measures

---

## 📊 Performance & Features

| Feature | Capability |
|---------|-----------|
| **PDF Upload Speed** | Multiple files in parallel |
| **Vector Search** | Semantic similarity with FAISS |
| **Response Time** | < 3 seconds average |
| **Context Window** | 15 previous messages |
| **Max File Size** | 50MB per document |
| **Supported Formats** | PDF, DOCX |
| **Concurrent Users** | Unlimited (server dependent) |
| **Mobile Support** | Full responsive design |
| **Dark Mode** | ✨ Fully optimized |

---

## 🛠️ Development & Customization

### Backend Configuration

Modify `backend/app/core/config.py` to customize:

```python
CHUNK_SIZE = 1000              # Token size per document chunk
CHUNK_OVERLAP = 200            # Overlap between chunks
TOP_K = 8                      # Number of top results to retrieve
MAX_CHAT_HISTORY = 10          # Messages to retain in context
MODEL_TEMPERATURE = 0.7        # Creativity level (0=factual, 1=creative)
```

### Frontend Theming

Edit `frontend/tailwind.config.js` to customize colors:

```js
colors: {
  primary: '#00ff88',          // Neon green
  dark: '#0f0f0f',             // Dark background
  // ... more colors
}
```

### Add Custom Prompts

Edit `backend/app/rag/prompts.py` to modify how answers are generated

---

## 🤝 Contributing

We ❤️ contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes StudyMind AI better for everyone.

### Getting Started with Contributions

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/pdf_qa_rag.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write clean, well-documented code
   - Follow existing code style and conventions
   - Add comments for complex logic

4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of changes
   - Link any related issues
   - Include screenshots if UI-related

### Contribution Ideas

- 🎨 Improve UI/UX design
- 🐛 Bug fixes and optimizations
- 📝 Documentation improvements
- 🧪 Write tests and test coverage
- 💬 Add language support/translations
- 🔌 New LLM provider integrations
- 📊 Analytics and usage tracking
- 🎓 Academic feature enhancements

---

## 🐛 Troubleshooting

### Common Issues

**Q: "GOOGLE_API_KEY not found"**
- Ensure `.env` file is in `backend/` directory
- Check API key is valid at [Google AI Studio](https://ai.google.dev/)

**Q: "FAISS index not building"**
- Verify PDFs were uploaded successfully
- Check `VECTOR_DB_PATH` has write permissions
- Ensure sufficient disk space available

**Q: "CORS errors in browser"**
- Verify `ALLOWED_ORIGINS` in `.env` matches your frontend URL
- Default is `http://localhost:5173`

**Q: "PDF not processing"**
- Check file size (max 50MB)
- Ensure PDF is text-extractable (not image-based)
- Try re-uploading with a fresh file

---

## 📈 Future Roadmap

We're constantly improving StudyMind AI! Upcoming features include:

- 🗂️ **Cloud Storage** - AWS S3/Google Drive integration for document backups
- 🗣️ **Voice Tutoring** - Ask questions verbally, get spoken answers
- 🌐 **Collaborative Learning** - Study groups with shared PDFs and notes
- 🎓 **MCQ Generation** - Auto-generate practice questions from materials
- 📊 **Progress Tracking** - Analytics on study habits and improvement
- 🌍 **Multi-Language** - Support for non-English study materials
- 🔐 **Authentication** - User accounts and progress persistence
- 📱 **Mobile App** - Native iOS/Android applications

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

MIT License allows free, private, commercial use with proper attribution.

---

## 🙏 Acknowledgments

- **Google Gemini API** - For the powerful LLM backbone
- **LangChain** - For RAG orchestration framework
- **FAISS** - For fast vector similarity search
- **React & Vite** - For the modern frontend framework
- **FastAPI** - For the elegant backend framework
- **All contributors** - For making this project better

---

## 📞 Get Support

- 📖 **Documentation**: Check our [Wiki](../../wiki)
- 🐛 **Report Issues**: [GitHub Issues](../../issues)
- 💬 **Discussions**: [GitHub Discussions](../../discussions)
- 📧 **Email**: [Contact Us](mailto:support@studymindai.dev)

---

<div align="center">

### Made with ❤️ for students everywhere

**Help others discover StudyMind AI! Please consider starring ⭐ this repository.**

[⬆ Back to Top](#📚-studymind-ai-intelligent-pdf-learning-assistant)

</div>
