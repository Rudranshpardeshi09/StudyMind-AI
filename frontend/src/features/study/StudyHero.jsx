import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Cube3D, GridPaper, OrbitRings, PaperStack3D, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { clipReveal, pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Summarise the key concepts in this material",
  "Explain the most important topic in simple terms",
  "What are the main definitions I should memorise?",
  "Give me three likely exam questions from this",
];

const OFFSETS = ["", "sm:translate-y-5", "sm:-translate-y-1", "sm:translate-y-4"];

function HeroArt({ className }) {
  return (
    <div aria-hidden="true" className={cn("relative", className)}>
      <div className="relative h-[260px] w-[250px] overflow-visible">
        <div className="absolute inset-x-2 inset-y-4 overflow-hidden rounded-hero border border-border bg-surface-sunk/70">
          <GridPaper cell={18} />
        </div>
        <div className="absolute left-1 top-10">
          <PaperStack3D size={150} />
        </div>
        <div className="absolute right-1 top-0">
          <Cube3D size={78} speed={0.7} />
        </div>
        <div className="absolute bottom-0 right-4 opacity-90">
          <OrbitRings size={104} />
        </div>
        <Sticker tone="cherry" rotate={-6} className="absolute -left-3 bottom-8">
          cites every page
        </Sticker>
        <Sticker tone="citron" rotate={5} shape="tag" className="absolute right-0 top-[96px]">
          no cap
        </Sticker>
      </div>
      <p className="mt-4 border-t border-border pt-2 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground">
        Fig. 3 — your pages, stacked and searchable.
      </p>
    </div>
  );
}

export default function StudyHero({ canAsk, onSuggestion, documentCount = 0 }) {
  const m = useReducedMotionSafe();

  return (
    <motion.section
      variants={m.variants(pageEnter)}
      initial={m.initial}
      animate="show"
      className="relative grid gap-10 pb-6 xl:grid-cols-[minmax(0,1fr)_250px] xl:gap-12 xl:pt-6"
    >
      <div aria-hidden="true" className="pointer-events-none absolute right-1 top-7 sm:right-4 sm:top-2 xl:hidden">
        <Cube3D size={52} speed={0.7} />
      </div>

      <div className="relative min-w-0">
        <motion.p variants={m.variants(riseIn)} className="eyebrow flex flex-wrap items-center gap-2">
          <span className="text-primary">New session /</span>
          <span>
            {canAsk
              ? `${documentCount} ${documentCount === 1 ? "source" : "sources"} on the desk`
              : "the desk is empty"}
          </span>
        </motion.p>

        <motion.h2
          variants={m.variants(clipReveal)}
          className="display mt-4 max-w-[13ch] text-[2.6rem] text-foreground sm:text-display"
        >
          {canAsk ? (
            <>
              Ask your notes <span className="display-italic marker">anything</span>.
            </>
          ) : (
            "No documents ready yet"
          )}
        </motion.h2>

        <motion.p
          variants={m.variants(riseIn)}
          className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground"
        >
          {canAsk
            ? "Answers are grounded in the documents you selected, and every one cites where it came from."
            : "Upload a PDF or DOCX in the Library and wait for indexing to finish."}
        </motion.p>

        {!canAsk && (
          <motion.div variants={m.variants(riseIn)} className="mt-7">
            <Button asChild>
              <Link to="/library">
                Go to Library
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        )}

        {canAsk && (
          <motion.div variants={m.variants(riseIn)} className="mt-9">
            <div className="mb-3 flex items-center gap-3">
              <p className="eyebrow text-foreground">Try one</p>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 sm:pb-5">
              {SUGGESTIONS.map((suggestion, index) => (
                <li key={suggestion} className={OFFSETS[index]}>
                  <button
                    type="button"
                    onClick={() => onSuggestion(suggestion)}
                    className={cn(
                      "group/ex flex h-full min-h-[92px] w-full flex-col justify-between gap-3 rounded-card border-2 border-border-strong bg-surface-raised p-4 text-left shadow-hs",
                      "transition-[transform,box-shadow] duration-150 ease-out",
                      "hover:-translate-x-px hover:-translate-y-0.5 hover:shadow-hs-lg",
                      "active:translate-x-[3px] active:translate-y-[3px] active:shadow-hs-press motion-reduce:transform-none"
                    )}
                  >
                    <span className="flex w-full items-center justify-between font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                      Ex.{String(index + 1).padStart(2, "0")}
                      <ArrowRight
                        className="size-4 text-foreground transition-transform duration-150 group-hover/ex:translate-x-1 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-[15px] font-medium leading-snug text-foreground">
                      {suggestion}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      <motion.div variants={m.variants(riseIn)} className="hidden justify-center xl:flex">
        <HeroArt />
      </motion.div>
    </motion.section>
  );
}
