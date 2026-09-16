/** Typed wrappers for every backend endpoint, grouped by feature. */

import { API_URL, getAccessToken, http } from "./http";

/* ------------------------------------------------------------------ auth */

export const authApi = {
  login: (email, password) =>
    http.post("/auth/login", { email, password }).then((r) => r.data),
  register: (email, password) =>
    http.post("/auth/register", { email, password }).then((r) => r.data),
  google: (idToken) =>
    http.post("/auth/google", { id_token: idToken }).then((r) => r.data),
  me: () => http.get("/auth/me").then((r) => r.data),
};

/* ------------------------------------------------------------- documents */

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Client-side validation. The server re-validates; this is only for fast feedback. */
export function validateFile(file) {
  if (!file) return "No file selected.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 50MB.`;
  }
  const name = file.name.toLowerCase();
  const extensionOk = name.endsWith(".pdf") || name.endsWith(".docx");
  if (!extensionOk && !ALLOWED_TYPES.includes(file.type)) {
    return "Only PDF and DOCX files can be indexed.";
  }
  return null;
}

export const documentsApi = {
  list: () => http.get("/ingest/documents").then((r) => r.data.documents ?? []),

  upload: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return http
      .post("/ingest/", form, {
        headers: { "Content-Type": "multipart/form-data" },
        // Bytes transferred is a real measured quantity, so a determinate bar
        // is honest here. It is capped at 99 until the server confirms receipt.
        onUploadProgress: (event) => {
          if (onProgress && event.total > 0) {
            onProgress(Math.min(Math.round((event.loaded * 100) / event.total), 99));
          }
        },
      })
      .then((r) => r.data);
  },

  retry: (documentId) =>
    http.post(`/ingest/${encodeURIComponent(documentId)}/retry`).then((r) => r.data),
  remove: (documentId) =>
    http.delete(`/ingest/${encodeURIComponent(documentId)}`).then((r) => r.data),
  reset: () => http.delete("/ingest/reset").then((r) => r.data),
};

/* ------------------------------------------------------------- syllabus */

export const syllabusApi = {
  parse: (file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post("/syllabus/upload", form).then((r) => r.data);
  },
};

/* ------------------------------------------------------------------ qa */

export const studyApi = {
  ask: (payload) => http.post("/qa/ask", payload).then((r) => r.data),

  /**
   * Streamed answer.
   *
   * Uses fetch rather than EventSource because the request is a POST and needs
   * an Authorization header. Each `onStage` call carries a real pipeline event;
   * nothing here synthesises or interpolates progress.
   *
   * Returns an abort function so the composer can cancel a generation.
   */
  askStream(payload, { onStage, onError, signal } = {}) {
    const controller = new AbortController();
    if (signal) signal.addEventListener("abort", () => controller.abort());

    const run = async () => {
      let response;
      try {
        response = await fetch(`${API_URL}/qa/ask/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken() ?? ""}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          onError?.("Cannot reach the server. Check your connection and try again.");
        }
        return;
      }

      if (!response.ok || !response.body) {
        let detail = "The answer service is unavailable right now.";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string") detail = body.detail;
        } catch {
          /* non-JSON error body */
        }
        onError?.(detail);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              onStage?.(JSON.parse(line.slice(6)));
            } catch {
              /* ignore an unparsable frame rather than killing the stream */
            }
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          onError?.("The connection dropped while generating your answer.");
        }
      }
    };

    run();
    return () => controller.abort();
  },
};

/* --------------------------------------------------------- chat sessions */

export const chatApi = {
  list: () => http.get("/chat-sessions/").then((r) => r.data),
  get: (sessionId) =>
    http.get(`/chat-sessions/${encodeURIComponent(sessionId)}`).then((r) => r.data),
  remove: (sessionId) =>
    http.delete(`/chat-sessions/${encodeURIComponent(sessionId)}`).then((r) => r.data),
};

/* ------------------------------------------------------------- mind maps */

export const mindMapsApi = {
  list: () => http.get("/mindmap/history").then((r) => r.data),
  get: (id) => http.get(`/mindmap/${encodeURIComponent(id)}`).then((r) => r.data),
  generate: (params) => http.post("/mindmap/generate", params).then((r) => r.data),
  structure: (documentId) =>
    http.get(`/mindmap/structure/${encodeURIComponent(documentId)}`).then((r) => r.data),
  rename: (id, title) =>
    http.patch(`/mindmap/${encodeURIComponent(id)}`, { title }).then((r) => r.data),
  remove: (id) => http.delete(`/mindmap/${encodeURIComponent(id)}`).then((r) => r.data),
};
