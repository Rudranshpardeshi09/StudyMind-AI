import axios from "axios";

// ════════════════════════════════════════════════════════════════════════════════
// API Configuration - Use environment variable for API URL
// ════════════════════════════════════════════════════════════════════════════════
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,  // 30 second timeout for all requests
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
 * Ask a question about the indexed PDF
 * @param {string} question - The question to ask
 * @param {string} subject - Subject from syllabus
 * @param {string} unit - Selected unit
 * @param {string} topic - Selected topic
 * @param {number} marks - Answer marks (3, 5, or 12)
 * @returns {Promise} Response with answer, pages, sources
 */
export const askQuestion = (question, subject, unit, topic, marks) => {
  // Input validation on client side
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Promise.reject(new Error("Question must be a non-empty string"));
  }
  if (typeof marks !== "number" || marks < 0) {
    return Promise.reject(new Error("Marks must be a non-negative number"));
  }
  
  return api.post("/qa/ask", {
    question: question.trim(),
    subject: subject || null,
    unit: unit || null,
    topic: topic || null,
    marks,
  });
};

