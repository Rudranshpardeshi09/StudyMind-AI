// this file handles all API calls to our backend server
import axios from "axios";

// the backend URL - uses environment variable if set, otherwise defaults to localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// creating an axios instance with default settings for all our API calls
const api = axios.create({
  baseURL: API_URL,
  // 10 minute timeout because PDF processing can take a while
  timeout: 10 * 60 * 1000,
  // no limits on file size for PDF uploads
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// this catches any API errors and handles them consistently
api.interceptors.response.use(
  response => response,
  error => {
    // log unauthorized access attempts
    if (error.response?.status === 401) {
      console.error("Unauthorized access");
    }
    return Promise.reject(error);
  }
);

// checks the processing status of uploaded PDFs
export const getIngestStatus = (filename) =>
  api.get("/ingest/status", { params: filename ? { filename } : {} });

// uploads a PDF file to the backend for processing
export const uploadPDF = (file, onProgress) => {
  // wrap the file in FormData since thats what the backend expects
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/ingest/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // report upload progress to show the progress bar
    onUploadProgress: (e) => {
      if (onProgress) {
        const percent = Math.round((e.loaded * 100) / e.total);
        onProgress(percent);
      }
    },
  });
};

// uploads a syllabus file (PDF or DOCX) and gets back parsed topics
export const uploadSyllabus = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/syllabus/upload", form);
};

// sends a question to the backend and gets an AI-generated answer
export const askQuestion = (question, syllabusContext = "", marks = 3, chatHistory = []) => {
  // make sure the question is valid before sending
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Promise.reject(new Error("Question must be a non-empty string"));
  }
  if (typeof marks !== "number" || marks < 1) {
    return Promise.reject(new Error("Marks must be a positive number"));
  }

  // clean up chat history to only include relevant messages
  const formattedHistory = chatHistory
    .filter(msg => msg.role === "user" || msg.role === "assistant")
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  // send the question along with context and history to the backend
  return api.post("/qa/ask", {
    question: question.trim(),
    syllabus_context: syllabusContext || null,
    marks,
    chat_history: formattedHistory.length > 0 ? formattedHistory : null,
  });
};

// deletes a specific PDF from the backend
export const deletePDF = (filename) =>
  api.delete(`/ingest/delete/${filename}`);

// deletes ALL PDFs and resets everything
export const resetPDFs = () =>
  api.delete("/ingest/reset");
