import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Bot, User, AlertTriangle } from "lucide-react";

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
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm shadow-md transition-all hover:shadow-lg ${isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-neon-600 dark:to-neon-700 text-white"
            : error
              ? "bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/80 dark:to-red-900/60 text-red-900 dark:text-red-200 border-2 border-red-300 dark:border-red-800"
              : "bg-gradient-to-br from-gray-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-950 text-gray-900 dark:text-neutral-100 border border-blue-200 dark:border-neon-500/40"
          }`}
      >
        {/* Role Badge with Lucide Icons */}
        {!isUser && (
          <Badge
            className={`mb-2 font-semibold text-xs flex items-center gap-1.5 w-fit ${error
                ? "bg-red-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-neon-600 dark:to-neon-500 text-white"
              }`}
          >
            {error ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                System
              </>
            ) : (
              <>
                <Bot className="w-3 h-3" />
                AI Tutor
              </>
            )}
          </Badge>
        )}

        {/* User Badge */}
        {isUser && (
          <Badge
            className="mb-2 font-semibold text-xs flex items-center gap-1.5 w-fit bg-white/20 text-white"
          >
            <User className="w-3 h-3" />
            You
          </Badge>
        )}

        {/* Message Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            className={isUser ? "text-white" : ""}
            components={{
              // Ensure paragraphs have proper spacing
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              // Style lists properly
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              // Style headings
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
              // Style code blocks
              code: ({ inline, children }) =>
                inline ? (
                  <code className="bg-gray-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-xs">{children}</code>
                ) : (
                  <code className="block bg-gray-200 dark:bg-neutral-800 p-2 rounded text-xs overflow-x-auto">{children}</code>
                ),
              // Style blockquotes
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 dark:border-neon-500 pl-3 italic my-2">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
