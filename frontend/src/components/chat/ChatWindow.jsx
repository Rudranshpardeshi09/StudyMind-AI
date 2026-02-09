import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askQuestion } from "@/api/client";
import { useApp } from "@/context/AppContext";
import { Sparkles, BookOpen, FileText, MessageSquare } from "lucide-react";
import MessageBubble from "./MessageBubble";
import SourcesPanel from "./SourcesPanel";
import ChatInput from "./ChatInput";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ChatWindow() {
  const {
    indexed,
    messages,
    setMessages,
    syllabusText,
    marks,
  } = useApp();

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendQuestion = useCallback(async (q) => {
    if (!indexed) {
      alert("Please upload at least one PDF document first.");
      return;
    }

    setMessages((m) => [...m, { role: "user", content: q }]);

    try {
      const res = await askQuestion(q, syllabusText, marks, messages);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
          error: res.data.error,
        },
      ]);
    } catch (error) {
      console.error("Error asking question:", error);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ Error: ${error.response?.data?.detail || "Failed to get answer. Please try again."}`,
          error: true,
        },
      ]);
    }
  }, [indexed, syllabusText, marks, messages, setMessages]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:bg-gradient-to-br dark:from-neutral-950 dark:via-black dark:to-black dark:border dark:border-neon-500/30 dark:shadow-2xl dark:shadow-neon/20 rounded-xl border-0 shadow-xl overflow-hidden transition-all duration-300 dark:hover:border-neon-500/50 dark:hover:shadow-neon-lg"
    >

      {/* HEADER - Compact */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-shrink-0 border-b border-blue-200 dark:border-neon-500/30 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-600 dark:to-neon-700 text-white transition-colors duration-300"
      >
        <h2 className="font-bold text-sm flex items-center gap-1.5">
          <motion.div
            animate={{ rotate: [0, 15, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          <span className="text-white">StudyMind AI</span>
        </h2>
        <p className="text-[10px] text-blue-100 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {indexed ? (
            <>
              <span className="flex items-center gap-0.5">
                <BookOpen className="w-2.5 h-2.5" /> PDFs ready
              </span>
              {syllabusText && (
                <span className="flex items-center gap-0.5">
                  • <FileText className="w-2.5 h-2.5" /> Syllabus
                </span>
              )}
              <span className="flex items-center gap-0.5">
                • <MessageSquare className="w-2.5 h-2.5" /> {marks === 3 ? "Short" : marks === 5 ? "Medium" : "Long"}
              </span>
            </>
          ) : (
            "Upload PDFs to start"
          )}
        </p>
      </motion.div>

      {/* MESSAGES SCROLL AREA */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full scrollbar-thin">
          <div className="space-y-2 p-2 sm:p-3">

            {messages.length === 0 && (
              <motion.div
                animate={{ opacity: [0.6, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="h-full flex items-center justify-center py-8"
              >
                <div className="text-center">
                  <p className="text-2xl mb-2">🎓</p>
                  <p className="text-xs text-gray-600 dark:text-neutral-400 px-4">
                    {!indexed
                      ? "Upload a PDF to get started"
                      : "Ask any question about your documents!"}
                  </p>
                  {indexed && !syllabusText && (
                    <p className="text-[10px] text-gray-500 dark:text-neutral-500 mt-1 px-4">
                      💡 Add syllabus for focused answers
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                  className="space-y-1"
                >
                  <MessageBubble role={m.role} content={m.content} error={m.error} />

                  {m.sources && m.sources.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <SourcesPanel sources={m.sources} />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>


      {/* INPUT AREA - Compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-shrink-0 border-t border-blue-200 dark:border-neon-500/30 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-neutral-950 dark:to-black transition-colors duration-300"
      >
        <ChatInput
          onSend={sendQuestion}
          disabled={!indexed}
        />
      </motion.div>
    </motion.div>
  );
}
