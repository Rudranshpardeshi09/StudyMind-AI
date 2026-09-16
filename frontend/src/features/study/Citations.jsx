import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Citations for one answer.
 *
 * Visible by default as compact chips rather than hidden behind a decorative
 * "View Sources" button: citations are the product's core trust claim, so the
 * fact that an answer is grounded should not require a click to discover.
 * Expanding a chip reveals the quoted passage.
 */
export default function Citations({ sources = [] }) {
  const [openIndex, setOpenIndex] = useState(null);
  const reduced = useReducedMotion();

  if (!sources.length) return null;

  return (
    <div className="mt-2.5">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {sources.length} {sources.length === 1 ? "source" : "sources"}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => {
          const isOpen = openIndex === index;
          const name = source.document_name || "Unknown document";
          return (
            <button
              key={source.chunk_id || `${name}-${source.page}-${index}`}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 " +
                  "text-xs transition-colors",
                isOpen
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border bg-surface-sunk text-muted-foreground hover:border-border-strong hover:text-foreground"
              )}
            >
              <FileText className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{name}</span>
              <span className="shrink-0 opacity-70">p.{source.page}</span>
              <ChevronDown
                className={cn("size-3 shrink-0 transition-transform", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {openIndex !== null && sources[openIndex] && (
          <motion.blockquote
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="mt-2 border-l-2 border-primary/40 bg-surface-sunk px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {sources[openIndex].text}
            </p>
          </motion.blockquote>
        )}
      </AnimatePresence>
    </div>
  );
}
