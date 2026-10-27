import axios from "axios";

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (import.meta.env.DEV) return "http://localhost:8000";
  console.error(
    "VITE_API_URL is not set. Set it to the backend URL at build time; API requests will fail until it is configured."
  );
  return "";
}

export const API_URL = resolveApiUrl();

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
    return null;
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
    }
    return null;
  }
}

export function getAccessToken() {
  return readSession()?.token ?? null;
}

export function getTokenClaims() {
  const token = getAccessToken();
  return token ? decodeJwtPayload(token) : null;
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

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : () => {};
}

export function handleUnauthorized() {
  unauthorizedHandler();
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
