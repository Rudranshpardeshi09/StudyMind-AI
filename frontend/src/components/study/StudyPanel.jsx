// this component lets users configure study settings like answer length and syllabus
import { useState, useCallback, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadSyllabus } from "@/api/client";
import { Settings, FileText, Edit3, Check, Zap } from "lucide-react";

// animation for the card appearing on screen
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.1 } },
};

// animation for expanding/collapsing sections
const sectionVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } }
};

// configuration for the three answer length options
const marksConfig = {
  3: { label: "Short", color: "from-blue-600 to-blue-700", icon: Zap, desc: "~100 words", darkColor: "dark:from-neon-600 dark:to-neon-700" },
  5: { label: "Medium", color: "from-indigo-600 to-indigo-700", icon: FileText, desc: "~250 words", darkColor: "dark:from-neon-500 dark:to-neon-600" },
  12: { label: "Long", color: "from-purple-600 to-purple-700", icon: Settings, desc: "~500 words", darkColor: "dark:from-neon-400 dark:to-neon-500" },
};

// a single marks selection button (short/medium/long)
const MarkButton = memo(({ mark, isActive, onClick }) => {
  const IconComponent = marksConfig[mark].icon;
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`py-2 px-1.5 rounded-lg font-semibold text-[10px] transition-all duration-300 flex flex-col items-center justify-center gap-0.5 ${isActive
        ? `bg-gradient-to-r ${marksConfig[mark].color} ${marksConfig[mark].darkColor} text-white shadow-lg dark:shadow-neon`
        : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neon-500/40 hover:bg-gray-200 dark:hover:bg-neutral-700"
        }`}
    >
      <IconComponent className="w-4 h-4" />
      <span className="font-bold">{mark} Marks</span>
      <span className="text-[8px] opacity-80">{marksConfig[mark].desc}</span>
    </motion.button>
  );
});

// custom toggle switch component for enabling/disabling study mode
const MotionSwitch = ({ isOn, onToggle }) => (
  <div
    onClick={onToggle}
    className={`w-9 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${isOn ? 'bg-purple-600 dark:bg-neon-600' : 'bg-gray-300 dark:bg-neutral-700'}`}
  >
    {/* the sliding circle inside the toggle */}
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
      className={`bg-white w-3 h-3 rounded-full shadow-md ${isOn ? 'ml-auto' : ''}`}
    />
  </div>
);

export default function StudyPanel() {
  // get shared study settings from context
  const { syllabusText, setSyllabusText, marks, setMarks, clearSyllabus } = useApp();

  // local state for syllabus file upload
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  // whether the syllabus context section is expanded or not
  const [isStudyMode, setIsStudyMode] = useState(false);

  // refs for cleanup
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);

  // cleanup effect when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // clears all syllabus data
  const handleClear = useCallback(() => {
    clearSyllabus();
    setFile(null);
    setError(null);
  }, [clearSyllabus]);

  // toggles study mode on/off and clears data when turning off
  const toggleWithClear = useCallback(() => {
    setIsStudyMode(prev => {
      if (prev === true) handleClear();
      return !prev;
    });
  }, [handleClear]);

  // handles when user picks a syllabus file
  const handleFileChange = useCallback((e) => {
    setFile(e.target.files?.[0] || null);
    setError(null);
  }, []);

  // uploads the selected syllabus file to the backend for parsing
  const handleFileUpload = useCallback(async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // send the file to backend for parsing
      const res = await uploadSyllabus(file);
      if (!isMountedRef.current) return;

      // format the parsed data into readable text
      const { subject, units } = res.data;
      let textContent = subject ? `Subject: ${subject}\n\n` : "";

      if (units && units.length > 0) {
        units.forEach((unit) => {
          textContent += `${unit.name}\n`;
          if (unit.topics?.length) {
            textContent += `Topics: ${unit.topics.join(", ")}\n`;
          }
          textContent += "\n";
        });
      }

      // update the syllabus text in shared context
      setSyllabusText(textContent.trim());
      setUploadSuccess(true);
      setFile(null);

      // hide the success message after 3 seconds
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) setUploadSuccess(false);
      }, 3000);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.detail || "Failed to parse syllabus");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [file, setSyllabusText]);

  // handles typing in the syllabus text area
  const handleTextChange = useCallback((e) => {
    setSyllabusText(e.target.value);
  }, [setSyllabusText]);

  // handles clicking a marks button
  const handleMarkChange = useCallback((m) => {
    setMarks(m);
  }, [setMarks]);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full w-full"
    >
      <Card className="h-full flex flex-col shadow-lg border-0 bg-gradient-to-br from-white to-purple-50 dark:bg-gradient-to-br dark:from-neutral-950 dark:via-black dark:to-black dark:border dark:border-neon-500/30 dark:shadow-2xl dark:shadow-neon/20 transition-all duration-300 overflow-hidden">

        {/* header with study mode toggle */}
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-neon-600 dark:to-neon-700 text-white rounded-t-lg px-3 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              <span className="text-white">Study Panel</span>
            </CardTitle>

            {/* on/off toggle for syllabus context mode */}
            <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              <span className="text-[9px] font-medium opacity-90">
                {isStudyMode ? "ON" : "OFF"}
              </span>
              <MotionSwitch isOn={isStudyMode} onToggle={toggleWithClear} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-2 flex-1 flex flex-col overflow-hidden min-h-0">
          <ScrollArea className="flex-1 w-full">
            <div className="space-y-3 pr-1">

              {/* answer length selection (short / medium / long) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-neutral-200 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Answer Length
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 5, 12].map((m) => (
                    <MarkButton
                      key={m}
                      mark={m}
                      isActive={marks === m}
                      onClick={() => handleMarkChange(m)}
                    />
                  ))}
                </div>
              </div>

              <Separator className="dark:bg-neutral-700" />

              {/* context section - shows depending on whether study mode is on */}
              <AnimatePresence>
                {!isStudyMode ? (
                  // when study mode is off, show a simple info message
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-center"
                  >
                    <p className="text-xs text-gray-600 dark:text-neutral-400">
                      Standard PDF Chat Mode
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-neutral-500 mt-0.5">
                      Enable context for syllabus focus
                    </p>
                  </motion.div>
                ) : (
                  // when study mode is on, show syllabus upload and text input
                  <motion.div
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-2"
                  >
                    {/* syllabus file upload area */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-700 dark:text-neutral-200 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Upload Syllabus
                      </label>
                      <div className="flex gap-1.5">
                        <div className="flex-1 relative">
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileChange}
                            disabled={loading}
                            className="hidden"
                            id="syllabus-upload"
                          />
                          <label
                            htmlFor="syllabus-upload"
                            className={`block w-full px-2 py-1.5 rounded-lg border-2 border-dashed text-center transition-all cursor-pointer text-[10px] truncate ${loading
                              ? "border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800"
                              : "border-purple-400 dark:border-neon-500/50 bg-purple-50 dark:bg-neutral-800 hover:border-purple-600"
                              }`}
                          >
                            {file ? file.name : "Choose file..."}
                          </label>
                        </div>
                        {/* button to send the file for parsing */}
                        <Button
                          onClick={handleFileUpload}
                          disabled={!file || loading}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 dark:bg-neon-600 text-white px-2 text-[10px] h-auto py-1.5"
                        >
                          {loading ? "..." : "Parse"}
                        </Button>
                      </div>
                    </div>

                    {/* error and success messages */}
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[10px] text-red-700 bg-red-100 p-1.5 rounded"
                        >
                          ⚠️ {error}
                        </motion.p>
                      )}
                      {uploadSuccess && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="bg-green-100 border border-green-300 p-1.5 rounded flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-green-700" />
                          <p className="text-[10px] text-green-700">Parsed!</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* text area for manually typing or editing syllabus context */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-gray-700 dark:text-neutral-200 flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Topics / Context
                        </label>
                        {/* clear button only shows when there is text */}
                        {syllabusText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-5 px-1.5 text-[9px] text-gray-500 hover:text-red-500"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <textarea
                        value={syllabusText}
                        onChange={handleTextChange}
                        placeholder="Paste syllabus or topics..."
                        className="w-full h-20 p-2 text-[10px] rounded-lg border-2 border-gray-300 dark:border-neon-500/40 bg-white dark:bg-neutral-900 focus:border-purple-500 resize-none"
                      />
                    </div>

                    {/* shows a confirmation when syllabus context is active */}
                    {syllabusText && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2 rounded-lg flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                        <p className="text-[10px] text-blue-700 dark:text-blue-400">Context active</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}