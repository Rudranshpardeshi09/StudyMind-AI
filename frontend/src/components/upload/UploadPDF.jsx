import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadPDF } from "@/api/client";
import { useApp } from "@/context/AppContext";
import { getIngestStatus } from "@/api/client";
import { deletePDF, resetPDFs } from "@/api/client";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const successVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
  exit: { scale: 0, opacity: 0 },
};

export default function UploadPDF() {
  const { setIndexed } = useApp();

  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const pollingRefs = useRef({});
  const [error, setError] = useState(null);

  /* ================= UPLOAD ================= */

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    setUploadedFiles((prev) => [
      ...prev,
      { name: file.name, progress: 0, status: "uploading" },
    ]);

    try {
      await uploadPDF(file, (p) => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, progress: p } : f
          )
        );
      });

      pollIngestionStatus(file.name);
    } catch {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.name === file.name ? { ...f, status: "failed" } : f
        )
      );
      setLoading(false);
    }
  };

  /* ================= POLLING ================= */

  const pollIngestionStatus = (filename) => {
    if (pollingRefs.current[filename]) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await getIngestStatus(filename);

        if (!res.data || res.data.status === "not_found") {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
          return;
        }

        setUploadedFiles((prev) => {
          const updated = prev.map((f) =>
            f.name === filename
              ? {
                  ...f,
                  status: res.data.status,
                  pages: res.data.pages,
                  chunks: res.data.chunks,
                  progress:
                    res.data.status === "completed" ? 100 : f.progress,
                }
              : f
          );

          // enable chat if ANY completed
          setIndexed(updated.some((f) => f.status === "completed"));

          // auto-unlock upload UI
          const stillBusy = updated.some(
            (f) =>
              f.status === "uploading" || f.status === "processing"
          );
          setLoading(stillBusy);

          return updated;
        });

        if (
          res.data.status === "completed" ||
          res.data.status === "failed"
        ) {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
        }
      } catch (err) {
        clearInterval(intervalId);
        delete pollingRefs.current[filename];
        setLoading(false);
      }
    }, 2000);

    pollingRefs.current[filename] = intervalId;
  };

  /* ================= DELETE ================= */

  const removePDF = async (filename) => {
    try {
      await deletePDF(filename);

      if (pollingRefs.current[filename]) {
        clearInterval(pollingRefs.current[filename]);
        delete pollingRefs.current[filename];
      }

      setUploadedFiles((prev) => {
        const next = prev.filter((f) => f.name !== filename);
        setIndexed(next.some((f) => f.status === "completed"));
        return next;
      });

      setLoading(false);
    } catch {
      setError("Failed to delete PDF");
      setLoading(false);
    }
  };

  /* ================= RESET ================= */

  const resetAll = async () => {
    try {
      await resetPDFs();

      Object.values(pollingRefs.current).forEach(clearInterval);
      pollingRefs.current = {};

      setUploadedFiles([]);
      setIndexed(false);
      setLoading(false);
    } catch {
      setError("Failed to reset PDFs");
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */

  const completedFiles = uploadedFiles.filter(
    (f) => f.status === "completed"
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full w-full"
    >
      {/* <Card className="h-full flex flex-col shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-shadow"> */}
      <Card className="h-full flex flex-col shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-black dark:border dark:border-emerald-500/30 dark:shadow-2xl dark:shadow-emerald-500/10 hover:shadow-xl transition-all duration-300 dark:hover:border-emerald-500/50 dark:hover:shadow-emerald-500/20">

        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-emerald-600 dark:to-emerald-700 text-white rounded-t-lg p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl">📄</span>
            <span>Upload PDF</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 flex-1 flex flex-col p-3 sm:p-5">

          {/* FILE INPUT */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
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
                className={`block w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center ${loading
                  ? "border-gray-300 bg-gray-50"
                  : "border-blue-400 bg-blue-50 hover:border-blue-600 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900 dark:hover:bg-blue-800"
                  }`}
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
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
                className="text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 p-2 sm:p-3 rounded-lg break-words"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOADING PROGRESS
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    style={{ width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <motion.p
                  className="text-xs text-center font-medium text-gray-600"
                  animate={{ opacity: [0.7, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Indexing document… {progress}%
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence> */}

          {/* SUCCESS STATE */}
          {/* <AnimatePresence>
            {completedFiles.length > 0 && (
              <motion.div
                variants={successVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 border-2 border-green-300 dark:border-green-700 rounded-lg p-3 sm:p-4 space-y-2"
              >
                <p className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <span className="text-lg sm:text-xl">✓</span> PDF Indexed Successfully
                </p>
                <div className="text-xs text-green-700 dark:text-green-400 space-y-1 break-words">
                  {completedFiles.map((f) => (
                    <p>📁 <strong className="break-all">{f.name}</strong>
                      📄 Pages: <strong>{f.pages}</strong></p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence> */}

          {/* MULTI PDF LIST */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                Uploaded PDFs
              </p>

              {uploadedFiles.map((f) => (
                <div
                  key={f.name}
                  className="bg-gray-100 dark:bg-slate-800 p-3 rounded space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate text-xs font-medium">{f.name}</span>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePDF(f.name)}
                    >
                      Delete
                    </Button>
                  </div>

                  {/* STATUS */}
                  <p className="text-[11px] text-gray-600">
                    Status: <strong>{f.status || "Processing"}</strong>
                  </p>

                  {/* PROGRESS BAR */}
                  {typeof f.progress === "number" && (
                    <div className="h-2 bg-gray-300 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${f.status === "completed"
                            ? "bg-green-500"
                            : f.status === "failed"
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}

                  {/* METADATA */}
                  {f.status === "completed" && (
                    <p className="text-[11px] text-green-700">
                      📄 Pages: {f.pages} | 🔗 Chunks: {f.chunks}
                    </p>
                  )}
                </div>
              ))}

              {uploadedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  className="w-full"
                >
                  Reset All PDFs
                </Button>
              )}
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
