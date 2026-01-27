import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";

const userBubbleVariants = {
  initial: { opacity: 0, x: 100, scale: 0.8 },
  animate: { opacity: 1, x: 0, scale: 1 },
};

const aiBubbleVariants = {
  initial: { opacity: 0, x: -100, scale: 0.8 },
  animate: { opacity: 1, x: 0, scale: 1 },
};

export default function MessageBubble({ role, content, error }) {
  const isUser = role === "user";
  const variants = isUser ? userBubbleVariants : aiBubbleVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm shadow-md transition-all hover:shadow-lg ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
            : error
              ? "bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 text-red-900 dark:text-red-200 border-2 border-red-300 dark:border-red-700"
              : "bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-800"
        }`}
      >
        {!isUser && (
          <Badge
            className={`mb-2 font-semibold text-xs ${
              error
                ? "bg-red-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            }`}
          >
            {error ? "⚠️ System" : "🤖 AI"}
          </Badge>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown className={isUser ? "text-white" : ""}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
