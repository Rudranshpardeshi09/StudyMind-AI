import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "./ThemeToggle";

export default function AppLayout({ children }) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-blue-200 dark:border-purple-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-purple-700 dark:via-purple-600 dark:to-cyan-500 shadow-lg"
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
          <motion.h1
            className="font-bold text-lg sm:text-xl md:text-2xl text-white flex items-center gap-1 sm:gap-2 flex-shrink-0"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <span className="text-2xl sm:text-3xl">🚀</span>
            <span className="hidden sm:inline">PDF RAG Study Assistant</span>
            <span className="sm:hidden text-sm">PDF RAG</span>
          </motion.h1>
          <div className="ml-auto flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <Separator />

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
