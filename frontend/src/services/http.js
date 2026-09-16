/**
 * HTTP core: axios instance, token storage and the 401 handler.
 *
 * The token lives in localStorage so a reload keeps the session. That is a
 * deliberate trade-off: it is readable by injected script, which is why the
 * server-side plan shortens token lifetime and adds refresh rotation. Until
 * that lands, the storage shape here already carries an explicit expiry so a
 * stale token is discarded client-side rather than sent and rejected.
 */

import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "sm_access_token";
const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function resolveExpiry(token, expiresInSeconds) {
  if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    return Date.now() + expiresInSeconds * 1000;
  }
  const payload = decodeJwtPayload(token);
  if (payload?.exp && Number.isFinite(payload.exp)) return payload.exp * 1000;
  return Date.now() + MAX_SESSION_MS;
}

function readSession() {
  let raw = null;
  try {
    raw = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // private mode / blocked storage
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt) throw new Error("malformed");
    if (Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function getAccessToken() {
  return readSession()?.token ?? null;
}

export function setAccessToken(token, expiresInSeconds = null) {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    const existing = readSession();
    const firstLoginAt = existing?.firstLoginAt ?? Date.now();
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({
        token,
        firstLoginAt,
        expiresAt: Math.min(
          firstLoginAt + MAX_SESSION_MS,
          resolveExpiry(token, expiresInSeconds)
        ),
      })
    );
  } catch {
    /* storage unavailable; the session simply will not survive a reload */
  }
}

export const http = axios.create({
  baseURL: API_URL,
  timeout: 5 * 60 * 1000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let unauthorizedHandler = () => {};

/** The router installs this so a 401 navigates instead of firing a window event. */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : () => {};
}

function isAuthEndpoint(url = "") {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/google") ||
    url.includes("/auth/me")
  );
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

/** Turn any axios failure into a sentence a person can act on. */
export function toMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const joined = detail.map((item) => item?.msg).filter(Boolean).join(" ");
    if (joined) return joined;
  }
  if (error?.response?.status === 429) {
    return "Too many requests. Wait a moment and try again.";
  }
  if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (error?.message === "Network Error") {
    return "Cannot reach the server. Check that the backend is running.";
  }
  return error?.message || fallback;
}
