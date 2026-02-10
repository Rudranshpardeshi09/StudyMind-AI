// this component handles PDF file uploads, shows progress, and allows deleting files
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadPDF, getIngestStatus, deletePDF, resetPDFs } from "@/api/client";
import { useApp } from "@/context/AppContext";
import { FileUp, Trash2, RefreshCw, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

// how often we check the backend for processing updates (every 2 seconds)
const POLLING_INTERVAL = 2000;

// animation for the card appearing
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

// this shows a single uploaded file with its status and delete button
const FileItem = memo(({ file, onDelete }) => (
  <div className="bg-gray-100 dark:bg-neutral-800/80 p-2 rounded space-y-1 transition-colors duration-300">
    {/* file name and delete button */}
    <div className="flex justify-between items-center gap-2">
      <span className="truncate text-[10px] font-medium flex-1 min-w-0 flex items-center gap-1">
        <FileText className="w-3 h-3 flex-shrink-0" />
        {file.name}
      </span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => onDelete(file.name)}
        className="flex-shrink-0 h-6 px-2 text-[10px]"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>

    {/* status indicator with icon */}
    <p className="text-[9px] text-gray-600 dark:text-neutral-400 flex items-center gap-1">
      {file.status === "completed" ? (
        <CheckCircle className="w-2.5 h-2.5 text-green-500" />
      ) : file.status === "failed" ? (
        <XCircle className="w-2.5 h-2.5 text-red-500" />
      ) : (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      )}
      <strong>{file.status || "Processing"}</strong>
    </p>

    {/* upload progress bar */}
    {typeof file.progress === "number" && (
      <div className="h-1.5 bg-gray-300 dark:bg-neutral-700 rounded overflow-hidden">
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

    {/* show page and chunk count after processing is done */}
    {file.status === "completed" && (
      <p className="text-[9px] text-green-700 dark:text-neon-400">
        Pages: {file.pages} | Chunks: {file.chunks}
      </p>
    )}
  </div>
));

export default function UploadPDF() {
  // get the setIndexed function from context to tell other components PDFs are ready
  const { setIndexed } = useApp();

  // local state for upload status
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  // refs for polling timers and component lifecycle
  const pollingRefs = useRef({});
  const isMountedRef = useRef(true);

  // cleanup polling timers when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      Object.values(pollingRefs.current).forEach(clearInterval);
      pollingRefs.current = {};
    };
  }, []);

  // update indexed status whenever files change
  useEffect(() => {
    // mark as indexed if any file has finished processing
    const hasCompleted = uploadedFiles.some((f) => f.status === "completed");
    setIndexed(hasCompleted);

    // show loading state if any file is still being processed
    const isBusy = uploadedFiles.some(
      (f) => f.status === "uploading" || f.status === "processing" || f.status === "pending"
    );
    setLoading(isBusy);
  }, [uploadedFiles, setIndexed]);

  // repeatedly checks the backend to see if a PDF is done processing
  const pollIngestionStatus = useCallback((filename) => {
    // dont start a new poller if one already exists for this file
    if (pollingRefs.current[filename]) return;

    const intervalId = setInterval(async () => {
      // stop polling if component was unmounted
      if (!isMountedRef.current) {
        clearInterval(intervalId);
        return;
      }

      try {
        // ask the backend for the current status of this file
        const res = await getIngestStatus(filename);

        if (!isMountedRef.current) return;

        // if file wasnt found, stop polling
        if (!res.data || res.data.status === "not_found") {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
          return;
        }

        // update the files status in our local state
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

        // stop polling once processing is complete or failed
        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(intervalId);
          delete pollingRefs.current[filename];
        }
      } catch {
        // stop polling if theres a network error
        clearInterval(intervalId);
        delete pollingRefs.current[filename];
      }
    }, POLLING_INTERVAL);

    pollingRefs.current[filename] = intervalId;
  }, []);

  // handles when a user selects a PDF file to upload
  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset the file input so the same file can be uploaded again if needed
    e.target.value = "";
    setError(null);

    // add the file to our list immediately with "uploading" status
    setUploadedFiles((prev) => [
      ...prev,
      { name: file.name, progress: 0, status: "uploading" },
    ]);

    try {
      // upload the file to the backend with progress tracking
      await uploadPDF(file, (p) => {
        if (!isMountedRef.current) return;
        // update the progress percentage as the file uploads
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, progress: p } : f
          )
        );
      });

      // start checking if the backend is done processing the file
      pollIngestionStatus(file.name);
    } catch {
      // mark the file as failed if upload didnt work
      if (isMountedRef.current) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "failed" } : f
          )
        );
      }
    }
  }, [pollIngestionStatus]);

  // deletes a single PDF from the backend and removes it from the list
  const removePDF = useCallback(async (filename) => {
    try {
      // tell backend to delete the file
      await deletePDF(filename);

      // stop polling for this file if its still being checked
      if (pollingRefs.current[filename]) {
        clearInterval(pollingRefs.current[filename]);
        delete pollingRefs.current[filename];
      }

      if (!isMountedRef.current) return;

      // remove the file from our local list
      setUploadedFiles((prev) => prev.filter((f) => f.name !== filename));
    } catch {
      if (isMountedRef.current) {
        setError("Failed to delete PDF");
      }
    }
  }, []);

  // deletes ALL uploaded PDFs and starts fresh
  const resetAll = useCallback(async () => {
    try {
      // tell backend to wipe everything
      await resetPDFs();

      // stop all active polling
      Object.values(pollingRefs.current).forEach(clearInterval);
      pollingRefs.current = {};

      if (!isMountedRef.current) return;

      // clear the local file list
      setUploadedFiles([]);
    } catch {
      if (isMountedRef.current) {
        setError("Failed to reset PDFs");
      }
    }
  }, []);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full w-full"
    >
      <Card className="h-full flex flex-col shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 dark:bg-gradient-to-br dark:from-neutral-950 dark:via-black dark:to-black dark:border dark:border-neon-500/30 dark:shadow-2xl dark:shadow-neon/20 hover:shadow-xl transition-all duration-300 dark:hover:border-neon-500/50 dark:hover:shadow-neon-lg overflow-hidden">

        {/* header with upload icon and title */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-600 dark:to-neon-700 text-white rounded-t-lg px-3 py-2 transition-colors duration-300 flex-shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <FileUp className="w-4 h-4" />
            <span className="text-white">Upload PDF</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 flex-1 flex flex-col p-2 overflow-hidden min-h-0">

          {/* file picker area */}
          <div className="space-y-1 flex-shrink-0">
            <label className="text-[10px] font-semibold text-gray-700 dark:text-neutral-200 block">
              Select PDF Document
            </label>
            <div className="relative">
              {/* hidden file input (we use a styled label instead) */}
              <input
                type="file"
                accept=".pdf,.docx,application/pdf"
                onChange={handleUpload}
                disabled={loading}
                className="hidden"
                id="pdf-upload"
              />
              {/* styled upload button */}
              <label
                htmlFor="pdf-upload"
                className={`block w-full px-2 py-2 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer text-center ${loading
                  ? "border-gray-300 bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800"
                  : "border-blue-400 bg-blue-50 hover:border-blue-600 hover:bg-blue-100 dark:border-neon-500/50 dark:bg-neutral-800 dark:hover:border-neon-400"
                  }`}
              >
                <span className="text-[10px] font-medium text-gray-700 dark:text-neutral-300">
                  {loading ? "Uploading..." : "Choose PDF or drag"}
                </span>
              </label>
            </div>
          </div>

          {/* error message if something went wrong */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 p-1.5 rounded-lg flex-shrink-0"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* list of uploaded files with their statuses */}
          {uploadedFiles.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <p className="font-semibold text-[10px] text-gray-700 dark:text-neutral-200 mb-1 flex-shrink-0">
                Uploaded ({uploadedFiles.length})
              </p>

              {/* scrollable file list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {uploadedFiles.map((f) => (
                  <FileItem key={f.name} file={f} onDelete={removePDF} />
                ))}
              </div>

              {/* button to delete all files at once */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="w-full mt-1.5 flex-shrink-0 text-[10px] h-7 flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset All
              </Button>
            </div>
          )}

          {/* helpful hint shown when no files are uploaded */}
          {!loading && uploadedFiles.length === 0 && (
            <motion.p
              className="text-[9px] text-gray-600 dark:text-neutral-500 flex-1 flex items-end"
              animate={{ opacity: [0.7, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨ Upload PDFs up to 50MB to search content.
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}