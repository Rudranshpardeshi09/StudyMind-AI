/**
 * The waiting state for an answer.
 *
 * Design rules, in priority order:
 *  1. Never claim a stage finished before its event arrived.
 *  2. Only show numbers the backend actually sent (passage count, document
 *     count). If a value is absent, the line is absent.
 *  3. Show the stages reached and the one running — not the ones still to come,
 *     which would invite reading the list as a progress bar.
 *  4. Elapsed time is measured, not estimated. No percentage anywhere.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAGES } from "./useAnswerStream";

function ElapsedTime({ startedAt }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () => setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Only appears once the wait is long enough to be worth acknowledging.
  if (seconds < 4) return null;
  return (
    <span className="tabular text-xs text-muted-foreground">{seconds}s</span>
  );
}

function StageRow({ stage, status, detail, reduced }) {
  const isDone = status === "done";
  const isActive = status === "active";

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-start gap-2.5"
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {isDone ? (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        ) : (
          <Loader2
            className={cn("size-3.5 text-primary", !reduced && "animate-spin")}
            aria-hidden="true"
          />
        )}
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            "text-sm",
            isDone ? "text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {stage.label}
        </span>
        {isActive && detail && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
        )}
      </span>
    </motion.li>
  );
}

/**
 * Build the sub-label for a stage, using only values the backend supplied.
 * Returns null when there is nothing true to say.
 */
function detailFor(stageId, detail) {
  if (stageId === "retrieving" && detail.documentCount) {
    const count = detail.documentCount;
    const noun = count === 1 ? "document" : "documents";
    return detail.scope === "selected"
      ? `Searching ${count} selected ${noun}`
      : `Searching ${count} ${noun}`;
  }
  if (stageId === "generating" && detail.passageCount) {
    const count = detail.passageCount;
    const passages = count === 1 ? "passage" : "passages";
    const from = detail.documents?.length
      ? ` from ${detail.documents.join(", ")}`
      : "";
    return `Found ${count} relevant ${passages}${from}`;
  }
  return null;
}

export default function AnswerProgress({
  activeStage,
  reachedIndex,
  detail = {},
  startedAt,
  onCancel,
}) {
  const reduced = useReducedMotion();
  const activeIndex = STAGES.findIndex((stage) => stage.id === activeStage);

  // Everything reached, plus the one currently running. Future stages are not
  // rendered — the reader should not be able to count down to completion.
  const visible = STAGES.slice(0, Math.max(reachedIndex + 1, activeIndex + 1));

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-lg border border-border bg-surface p-4"
      // The transcript announces the final answer; per-stage chatter would be
      // noise for a screen reader, so stages are not individually announced.
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Generating
        </span>
        <div className="flex items-center gap-2">
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
      </div>

      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visible.map((stage, index) => (
            <StageRow
              key={stage.id}
              stage={stage}
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
