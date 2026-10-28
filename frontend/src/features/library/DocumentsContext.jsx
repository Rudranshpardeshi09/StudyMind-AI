import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { documentsApi, validateFile } from "@/services/api";
import { toMessage } from "@/services/http";

const DocumentsContext = createContext(null);

const ACTIVE = new Set(["queued", "uploading", "parsing", "embedding"]);
const POLL_MS = 2000;
const POLL_MAX_MS = 15000;

export function DocumentsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState({});

  const mounted = useRef(true);
  const timer = useRef(null);
  const backoff = useRef(POLL_MS);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!isAuthenticated) {
        setDocuments([]);
        return [];
      }
      if (!quiet) setLoading(true);
      try {
        const list = await documentsApi.list();
        if (!mounted.current) return [];
        setDocuments(list);
        setError(null);
        return list;
      } catch (requestError) {
        if (mounted.current) setError(toMessage(requestError, "Could not load your documents."));
        return [];
      } finally {
        if (mounted.current && !quiet) setLoading(false);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!isAuthenticated) return undefined;

    const anyActive = documents.some((doc) => ACTIVE.has(doc.status));
    if (!anyActive) {
      backoff.current = POLL_MS;
      return undefined;
    }

    timer.current = setTimeout(async () => {
      const next = await refresh({ quiet: true });
      const stillActive = next.some((doc) => ACTIVE.has(doc.status));
      backoff.current = stillActive
        ? Math.min(backoff.current * 1.4, POLL_MAX_MS)
        : POLL_MS;
    }, backoff.current);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [documents, isAuthenticated, refresh]);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setDocuments([]);
  }, [isAuthenticated, user?.sub, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh({ quiet: true });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, refresh]);

  const upload = useCallback(
    async (file) => {
      const invalid = validateFile(file);
      if (invalid) return { ok: false, message: invalid };

      setUploads((prev) => ({ ...prev, [file.name]: 0 }));
      try {
        const result = await documentsApi.upload(file, (percent) => {
          if (mounted.current) setUploads((prev) => ({ ...prev, [file.name]: percent }));
        });
        await refresh({ quiet: true });
        return {
          ok: true,
          duplicate: result.status === "duplicate",
          message: result.message,
        };
      } catch (requestError) {
        return { ok: false, message: toMessage(requestError, "Upload failed.") };
      } finally {
        if (mounted.current) {
          setUploads((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        }
      }
    },
    [refresh]
  );

  const retry = useCallback(
    async (documentId) => {
      await documentsApi.retry(documentId);
      await refresh({ quiet: true });
    },
    [refresh]
  );

  const remove = useCallback(
    async (documentId) => {
      await documentsApi.remove(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    },
    []
  );

  const resetAll = useCallback(async () => {
    await documentsApi.reset();
    setDocuments([]);
  }, []);

  const ready = useMemo(
    () => documents.filter((doc) => doc.status === "ready"),
    [documents]
  );
  const processing = useMemo(
    () => documents.filter((doc) => ACTIVE.has(doc.status)),
    [documents]
  );
  const failed = useMemo(
    () => documents.filter((doc) => doc.status === "failed"),
    [documents]
  );

  const value = useMemo(
    () => ({
      documents,
      ready,
      processing,
      failed,
      loading,
      error,
      uploads,
      refresh,
      upload,
      retry,
      remove,
      resetAll,
      clearError: () => setError(null),
    }),
    [documents, ready, processing, failed, loading, error, uploads, refresh, upload, retry, remove, resetAll]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const context = useContext(DocumentsContext);
  if (!context) throw new Error("useDocuments must be used within DocumentsProvider");
  return context;
}
