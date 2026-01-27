import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadSyllabus } from "@/api/client";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.1 } },
};

const successVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
  exit: { scale: 0, opacity: 0 },
};

export default function SyllabusUpload() {
  const { setSubject, setSyllabusData, setUnit, setTopic } = useApp();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await uploadSyllabus(file);
      const { subject, units } = res.data;

      setSubject(subject);
      setSyllabusData({ subject, units });
      setUnit("");
      setTopic("");
      setUploadSuccess(true);
      setFile(null);

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload syllabus");
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 text-white rounded-t-lg p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl">📋</span>
            <span>Upload Syllabus</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-5">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Upload syllabus (PDF/DOCX) to extract units and topics
          </p>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 block">
              Select File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError(null);
                }}
                disabled={loading}
                className="hidden"
                id="syllabus-upload"
              />
              <label
                htmlFor="syllabus-upload"
                className={`block w-full px-3 py-2 rounded-lg border-2 border-dashed text-center transition-all cursor-pointer text-xs ${
                  loading
                    ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-700"
                    : "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-slate-700 hover:border-purple-600 dark:hover:border-purple-400 hover:bg-purple-100 dark:hover:bg-slate-600"
                }`}
              >
                <span className="truncate">
                  {file ? file.name : "Choose PDF or DOCX"}
                </span>
              </label>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 p-2 rounded break-words"
              >
                ⚠️ {error}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {uploadSuccess && (
              <motion.div
                variants={successVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 border-2 border-green-300 dark:border-green-700 p-2 sm:p-3 rounded-lg"
              >
                <p className="text-xs font-bold text-green-700 dark:text-green-300">
                  ✓ Syllabus Parsed Successfully!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 text-white font-semibold text-xs sm:text-sm hover:shadow-lg transition-all disabled:opacity-50 dark:hover:from-purple-600 dark:hover:to-pink-600 py-2 h-auto"
              size="sm"
            >
              {loading ? (
                <motion.span animate={{ opacity: [0.7, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  Parsing...
                </motion.span>
              ) : (
                "Upload & Parse"
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
