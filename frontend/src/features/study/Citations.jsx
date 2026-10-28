import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { EASE_DRAW } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Citations({ sources = [], className }) {
  const [openIndex, setOpenIndex] = useState(null);
  const reduced = useReducedMotion();

  if (!sources.length) return null;

  const open = openIndex !== null ? sources[openIndex] : null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="eyebrow text-foreground">Sources</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground tabular">
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 min-[1400px]:flex-col min-[1400px]:flex-nowrap">
        {sources.map((source, index) => {
          const isOpen = openIndex === index;
          const name = source.document_name || "Unknown document";
          return (
            <button
              key={source.chunk_id || `${name}-${source.page}-${index}`}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              title={`${name} · page ${source.page}`}
              className={cn(
                "group/cite inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-control border-2 border-border-strong px-2.5 text-left",
                "font-mono text-[11.5px] leading-tight shadow-hs-sm",
                "transition-[transform,box-shadow,background-color] [transition-duration:120ms] ease-out",
                "hover:-translate-x-px hover:-translate-y-px hover:shadow-hs",
                "active:translate-x-0.5 active:translate-y-0.5 active:shadow-hs-press",
                "motion-reduce:transform-none sm:min-h-9 min-[1400px]:w-full",
                isOpen
                  ? "bg-ink text-bone dark:bg-bone dark:text-ink"
                  : "bg-surface-raised text-foreground"
              )}
            >
              <span
                className={cn(
                  "shrink-0 font-semibold tabular",
                  isOpen ? "text-citron dark:text-primary" : "text-primary"
                )}
                aria-hidden="true"
              >
                [{index + 1}]
              </span>
              <span className="min-w-0 truncate">{name}</span>
              <span aria-hidden="true" className="shrink-0 opacity-50">
                ·
              </span>
              <span className="shrink-0 tabular opacity-80">p.{source.page}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.blockquote
            key={openIndex}
            initial={reduced ? false : { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
            exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.38, ease: EASE_DRAW }}
            className="relative mt-4 border-l-[3px] border-primary pl-4"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-3 left-3 font-display text-5xl leading-none text-primary/25"
            >
              &ldquo;
            </span>
            <p className="relative font-display text-[15px] italic leading-relaxed text-foreground/90 [font-variation-settings:'SOFT'_100,'WONK'_0]">
              {open.text}
            </p>
            <footer className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground [overflow-wrap:anywhere]">
              <span className="text-primary">[{openIndex + 1}]</span>{" "}
              {open.document_name || "Unknown document"} — page {open.page}
            </footer>
          </motion.blockquote>
        )}
      </AnimatePresence>
    </div>
  );
}
