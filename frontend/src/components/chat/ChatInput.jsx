import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onSend(text);
      setText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3">
      <motion.div
        className="flex-1"
        whileFocus={{ scale: 1.02 }}
      >
        <Input
          placeholder="Ask about the study material..."
          disabled={disabled || isLoading}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`text-xs sm:text-sm border-2 transition-all font-medium ${
            disabled || isLoading
              ? "border-gray-300 bg-gray-50 opacity-50"
              : "border-blue-400 bg-white focus:border-blue-600 focus:ring-blue-500"
          }`}
        />
      </motion.div>
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          disabled={disabled || !text.trim() || isLoading}
          onClick={handleSend}
          className={`font-semibold transition-all text-xs sm:text-sm py-2 h-auto ${
            disabled || !text.trim() || isLoading
              ? "opacity-50 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg"
          }`}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </motion.div>
    </div>
  );
}
