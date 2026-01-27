import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";

export default function SourcesPanel({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!sources?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full mt-2 px-2 sm:px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all shadow-md hover:shadow-lg dark:from-amber-600 dark:to-orange-600 dark:hover:from-amber-700 dark:hover:to-orange-700"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isOpen ? (
          <>
            <span>✕</span>
            <span className="hidden sm:inline">Hide Sources</span>
            <span className="sm:hidden">Hide</span>
          </>
        ) : (
          <>
            <span>👁️</span>
            <span className="hidden sm:inline">View Sources</span>
            <span className="sm:hidden">View</span>
          </>
        )}
      </motion.button>

      {/* Collapsible Sources Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mt-2 p-2 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-2 border-amber-300 dark:border-amber-600 shadow-md max-h-60 overflow-y-auto">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 sm:mb-3 flex items-center gap-1">
                📚 Sources Referenced
              </p>
              <div className="space-y-2">
                {sources.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="text-xs bg-white dark:bg-slate-800 rounded-lg p-2 border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <p className="font-semibold text-amber-900 dark:text-amber-300">
                      📖 Page {s.page}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 line-clamp-2 text-xs break-words">
                      {s.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
