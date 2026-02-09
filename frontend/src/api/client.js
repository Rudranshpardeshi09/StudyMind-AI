import axios from "axios";

// ════════════════════════════════════════════════════════════════════════════════
// API Configuration - Use environment variable for API URL
// ════════════════════════════════════════════════════════════════════════════════
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,

  // ⏱️ Allow long-running uploads (PDF parsing + embeddings)
  timeout: 10 * 60 * 1000, // 10 minutes

  // 📦 Allow large PDFs
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Error interceptor for consistent error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error("Unauthorized access");
    }
    return Promise.reject(error);
  }
);

export const getIngestStatus = (filename) =>
  api.get("/ingest/status", { params: filename ? { filename } : {} });

/**
 * Upload a PDF document for indexing
 * @param {File} file - PDF file to upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise} Response with status, filename, pages, chunks
 */
export const uploadPDF = (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/ingest/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress) {
        const percent = Math.round((e.loaded * 100) / e.total);
        onProgress(percent);
      }
    },
  });
};

/**
 * Upload and parse a syllabus (PDF or DOCX)
 * @param {File} file - Syllabus file
 * @returns {Promise} Response with subject, units[], topics[], formats
 */
export const uploadSyllabus = (file) => {
  const form = new FormData();
  form.append("file", file);

  return api.post("/syllabus/upload", form);
};

/**
 * Ask a question about ALL indexed PDFs
 * @param {string} question - The question to ask
 * @param {string} syllabusContext - User's syllabus/topics text (optional)
 * @param {number} marks - Answer length: 3=short, 5=medium, 12=long
 * @param {Array} chatHistory - Previous messages for context [{role, content}]
 * @returns {Promise} Response with answer, pages, sources
 */
export const askQuestion = (question, syllabusContext = "", marks = 3, chatHistory = []) => {
  // Input validation
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Promise.reject(new Error("Question must be a non-empty string"));
  }
  if (typeof marks !== "number" || marks < 1) {
    return Promise.reject(new Error("Marks must be a positive number"));
  }

  // Format chat history - only include user and assistant messages
  const formattedHistory = chatHistory
    .filter(msg => msg.role === "user" || msg.role === "assistant")
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  return api.post("/qa/ask", {
    question: question.trim(),
    syllabus_context: syllabusContext || null,
    marks,
    chat_history: formattedHistory.length > 0 ? formattedHistory : null,
  });
};

export const deletePDF = (filename) =>
  api.delete(`/ingest/delete/${filename}`);

export const resetPDFs = () =>
  api.delete("/ingest/reset");
