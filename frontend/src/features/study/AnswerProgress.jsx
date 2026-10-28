import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detailFor } from "./stageText";
import { STAGES } from "./useAnswerStream";

function ElapsedTime({ startedAt }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () => setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (seconds < 4) return null;
  return (
    <span className="tabular font-mono text-[11px] text-muted-foreground">{seconds}s</span>
  );
}

function StageRow({ stage, index, status, detail, reduced }) {
  const isDone = status === "done";
  const isActive = status === "active";

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="relative flex items-start gap-3 py-2"
    >
      <span
        className={cn(
          "relative z-10 mt-px flex size-5 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[9px] font-semibold",
          isDone && "border-border-strong bg-success text-success-foreground",
          isActive && "border-border-strong bg-primary text-primary-foreground",
          !isDone && !isActive && "border-border bg-surface text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {isDone ? <Check className="size-3" strokeWidth={3} /> : String(index + 1)}
        {isActive && !reduced && (
          <span className="absolute inset-[-5px] animate-ping rounded-full border-2 border-primary/50" />
        )}
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] leading-snug",
            isDone ? "text-muted-foreground line-through decoration-border" : "font-semibold text-foreground"
          )}
        >
          {stage.label}
        </span>
        {isActive && detail && (
          <span
            className="mt-1 line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
            title={typeof detail === "string" ? detail : undefined}
          >
            {detail}
          </span>
        )}
      </span>
    </motion.li>
  );
}

export default function AnswerProgress({
  activeStage,
  reachedIndex,
  detail = {},
  startedAt,
  onCancel,
  className,
}) {
  const reduced = useReducedMotion();
  const activeIndex = STAGES.findIndex((stage) => stage.id === activeStage);

  const visible = STAGES.slice(0, Math.max(reachedIndex + 1, activeIndex + 1));

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-w-0", className)}
      aria-hidden="true"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="eyebrow text-foreground">Stage ledger</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {startedAt && <ElapsedTime startedAt={startedAt} />}
        {onCancel && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <X />
          </Button>
        )}
      </div>

      <ul className="relative">
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[9px] top-4 w-px border-l border-dashed border-border-strong/40"
        />
        <AnimatePresence initial={false}>
          {visible.map((stage, index) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={index}
              status={index < activeIndex || activeIndex === -1 ? "done" : "active"}
              detail={detailFor(stage.id, detail)}
              reduced={reduced}
            />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
