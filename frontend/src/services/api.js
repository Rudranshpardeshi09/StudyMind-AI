import { API_URL, getAccessToken, handleUnauthorized, http } from "./http";

export const authApi = {
  login: (email, password) =>
    http.post("/auth/login", { email, password }).then((r) => r.data),
  register: (email, password) =>
    http.post("/auth/register", { email, password }).then((r) => r.data),
  google: (idToken) =>
    http.post("/auth/google", { id_token: idToken }).then((r) => r.data),
  me: () => http.get("/auth/me").then((r) => r.data),
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

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

export const studyApi = {
  askStream(payload, { onStage, onError, signal } = {}) {
    const controller = new AbortController();
    if (signal) signal.addEventListener("abort", () => controller.abort());

    const run = async () => {
      let response;
      const token = getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        response = await fetch(`${API_URL}/qa/ask/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          onError?.("Cannot reach the server. Check your connection and try again.");
        }
        return;
      }

      if (response.status === 401) {
        handleUnauthorized();
        onError?.("Your session has expired. Please sign in again.");
        return;
      }

      if (!response.ok || !response.body) {
        let detail = "The answer service is unavailable right now.";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string") detail = body.detail;
        } catch {
        }
        onError?.(detail);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let terminal = false;

      const handleFrame = (frame) => {
        const line = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!line) return;
        let event;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          return;
        }
        if (event?.stage === "completed" || event?.stage === "failed") terminal = true;
        try {
          onStage?.(event);
        } catch {
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          frames.forEach(handleFrame);
        }
        buffer += decoder.decode();
        if (buffer.trim()) handleFrame(buffer);
      } catch (error) {
        if (error.name !== "AbortError") {
          onError?.("The connection dropped while generating your answer.");
        }
        return;
      }

      if (!terminal && !controller.signal.aborted) {
        onError?.("The connection closed before the answer finished.");
      }
    };

    run();
    return () => controller.abort();
  },
};

export const chatApi = {
  list: () => http.get("/chat-sessions/").then((r) => r.data),
  get: (sessionId) =>
    http.get(`/chat-sessions/${encodeURIComponent(sessionId)}`).then((r) => r.data),
  remove: (sessionId) =>
    http.delete(`/chat-sessions/${encodeURIComponent(sessionId)}`).then((r) => r.data),
};

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
