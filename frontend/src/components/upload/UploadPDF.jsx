import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadPDF, getIngestStatus, deletePDF, resetPDFs } from "@/api/client";
import { useApp } from "@/context/AppContext";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const POLLING_INTERVAL = 2000;

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

// ══════════════════════════════════════════════════════════════════════════════
// MEMOIZED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
const FileItem = memo(({ file, onDelete }) => (
  <div className="bg-gray-100 dark:bg-neutral-800/80 p-3 rounded space-y-1 transition-colors duration-300">
    <div className="flex justify-between items-center gap-2">
      <span className="truncate text-xs font-medium flex-1 min-w-0">{file.name}</span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => onDelete(file.name)}
        className="flex-shrink-0"
      >
        Delete
      </Button>
    </div>

    <p className="text-[11px] text-gray-600 dark:text-neutral-400">
      Status: <strong>{file.status || "Processing"}</strong>
    </p>

    {typeof file.progress === "number" && (
      <div className="h-2 bg-gray-300 dark:bg-neutral-700 rounded overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${file.status === "completed"
            ? "bg-green-500 dark:bg-neon-500"
            : file.status === "failed"
              ? "bg-red-500"
              : "bg-blue-500 dark:bg-neon-600"
            }`}
          style={{ width: `${file.progress}%` }}
        />
      </div>
    )}

    {file.status === "completed" && (
      <p className="text-[11px] text-green-700 dark:text-neon-400">
        📄 Pages: {file.pages} | 🔗 Chunks: {file.chunks}
      </p>
    )}
  </div>
));

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function UploadPDF() {
  const { setIndexed } = useApp();

  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Moved to AppContext
  const [error, setError] = useState(null);

  const pollingRefs = useRef({});
  const isMountedRef = useRef(true);

  // ✅ 1. LIFECYCLE: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      Object.values(pollingRefs.current).forEach(clearInterval);
      pollingRefs.current = {};
    };
  }, []);

  // ✅ 2. NEW: Safe Side Effects (This fixes your error)
  // Instead of setting state inside other state updaters, we watch 'uploadedFiles'
  useEffect(() => {
    // Sync Global Context: If any file is completed, app is "Indexed"
    const hasCompleted = uploadedFiles.some((f) => f.status === "completed");
    setIndexed(hasCompleted);

    // Sync Loading State: If any file is uploading/processing, we are "Loading"
    const isBusy = uploadedFiles.some(
      (f) => f.status === "uploading" || f.status === "processing" || f.status === "pending"
    );
    setLoading(isBusy);

  }, [uploadedFiles, setIndexed]);


  /* ================= POLLING ================= */

  const pollIngestionStatus = useCallback((filename) => {
    if (pollingRefs.current[filename]) return;

    const intervalId = setInterval(async () => {
      if (!isMountedRef.current) {
        clearInterval(intervalId);
        return;
      }

      try {
        const res = await getIngestStatus(filename);

        if (!isMountedRef.current) return;

        if (!res.data || res.data.status === "not_found") {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
          return;
        }

        // ✅ FIXED: Only update local state here. 
        // The useEffect above handles setIndexed and setLoading automatically.
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === filename
              ? {
                ...f,
                status: res.data.status,
                pages: res.data.pages,
                chunks: res.data.chunks,
                progress: res.data.status === "completed" ? 100 : f.progress,
              }
              : f
          )
        );

        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
        }
      } catch {
        clearInterval(intervalId);
        delete pollingRefs.current[filename];
      }
    }, POLLING_INTERVAL);

    pollingRefs.current[filename] = intervalId;
  }, []);

  /* ================= UPLOAD ================= */

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setError(null);
    // Note: setLoading(true) is handled automatically by the useEffect when we add the file below

    setUploadedFiles((prev) => [
      ...prev,
      { name: file.name, progress: 0, status: "uploading" },
    ]);

    try {
      await uploadPDF(file, (p) => {
        if (!isMountedRef.current) return;
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, progress: p } : f
          )
        );
      });

      pollIngestionStatus(file.name);
    } catch {
      if (isMountedRef.current) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "failed" } : f
          )
        );
      }
    }
  }, [pollIngestionStatus]);

  /* ================= DELETE ================= */

  const removePDF = useCallback(async (filename) => {
    try {
      await deletePDF(filename);

      if (pollingRefs.current[filename]) {
        clearInterval(pollingRefs.current[filename]);
        delete pollingRefs.current[filename];
      }

      if (!isMountedRef.current) return;

      // ✅ FIXED: Just filter the list. The useEffect handles the rest.
      setUploadedFiles((prev) => prev.filter((f) => f.name !== filename));

    } catch {
      if (isMountedRef.current) {
        setError("Failed to delete PDF");
      }
    }
  }, []);

  /* ================= RESET ================= */

  const resetAll = useCallback(async () => {
    try {
      await resetPDFs();

      Object.values(pollingRefs.current).forEach(clearInterval);
      pollingRefs.current = {};

      if (!isMountedRef.current) return;

      setUploadedFiles([]);
    } catch {
      if (isMountedRef.current) {
        setError("Failed to reset PDFs");
      }
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full w-full"
    >
      <Card className="h-full flex flex-col shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 dark:bg-gradient-to-br dark:from-neutral-950 dark:via-black dark:to-black dark:border dark:border-neon-500/30 dark:shadow-2xl dark:shadow-neon/20 hover:shadow-xl transition-all duration-300 dark:hover:border-neon-500/50 dark:hover:shadow-neon-lg">

        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-600 dark:to-neon-700 text-white rounded-t-lg p-3 sm:p-4 transition-colors duration-300">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl">📄</span>
            <span>Upload PDF</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 flex-1 flex flex-col p-3 sm:p-5">

          {/* FILE INPUT */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-neutral-200 block">
              Select PDF Document
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleUpload}
                disabled={loading}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className={`block w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer text-center ${loading
                  ? "border-gray-300 bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800"
                  : "border-blue-400 bg-blue-50 hover:border-blue-600 hover:bg-blue-100 dark:border-neon-500/50 dark:bg-neutral-800 dark:hover:border-neon-400 dark:hover:bg-neutral-700 dark:hover:shadow-neon-sm"
                  }`}
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-neutral-300">
                  {loading ? "Uploading..." : "Choose PDF or drag"}
                </span>
              </label>
            </div>
          </div>

          {/* ERROR STATE */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 p-2 sm:p-3 rounded-lg break-words animate-fade-in"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* MULTI PDF LIST - WITH SCROLLING */}
          {uploadedFiles.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 text-xs">
              <p className="font-semibold text-gray-700 dark:text-neutral-200 mb-2 flex-shrink-0">
                Uploaded PDFs ({uploadedFiles.length})
              </p>

              <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1 scrollbar-thin scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-600">
                {uploadedFiles.map((f) => (
                  <FileItem key={f.name} file={f} onDelete={removePDF} />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="w-full mt-2 flex-shrink-0"
              >
                Reset All PDFs
              </Button>
            </div>
          )}

          {/* INFO */}
          {!loading && uploadedFiles.length === 0 && (
            <motion.p
              className="text-xs text-gray-600 flex-1 flex items-end"
              animate={{ opacity: [0.7, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨ Upload a PDF document to index and search its content. Supports PDFs up to 50MB.
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}