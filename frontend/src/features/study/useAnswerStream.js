/**
 * Drives one answer generation and exposes the stages the backend actually
 * reported.
 *
 * The contract that matters: a stage is only ever marked complete when its
 * event has arrived. Nothing advances on a timer, and no percentage is
 * synthesised. If the stream dies mid-flight the last reached stage stays
 * "active" and the turn goes to `failed` — it never silently completes.
 */

import { useCallback, useRef, useState } from "react";

import { studyApi } from "@/services/api";

/**
 * The pipeline's stage vocabulary, in the order the backend emits it.
 * `label` is what the user reads while the stage is running.
 */
export const STAGES = [
  { id: "preparing", label: "Understanding your question" },
  { id: "retrieving", label: "Searching your study material" },
  { id: "analyzing", label: "Finding relevant sections" },
  { id: "generating", label: "Building your answer" },
  { id: "validating", label: "Checking citations" },
];

const STAGE_INDEX = new Map(STAGES.map((stage, index) => [stage.id, index]));

const IDLE = {
  status: "idle",
  activeStage: null,
  reachedIndex: -1,
  detail: {},
  error: null,
};

export function useAnswerStream() {
  const [state, setState] = useState(IDLE);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setState(IDLE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setState((prev) => ({ ...prev, status: "cancelled", activeStage: null }));
  }, []);

  /**
   * @returns {Promise<{ok: boolean, result?: object, error?: string, cancelled?: boolean}>}
   */
  const ask = useCallback((payload) => {
    setState({ ...IDLE, status: "streaming" });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (outcome) => {
        if (settled) return;
        settled = true;
        abortRef.current = null;
        resolve(outcome);
      };

      const abort = studyApi.askStream(payload, {
        onStage: (event) => {
          const { stage } = event;

          if (stage === "completed") {
            setState((prev) => ({
              ...prev,
              status: "completed",
              activeStage: null,
              reachedIndex: STAGES.length, // every stage genuinely finished
            }));
            finish({ ok: true, result: event.result });
            return;
          }

          if (stage === "failed") {
            setState((prev) => ({
              ...prev,
              status: "failed",
              activeStage: null,
              error: event.error,
            }));
            finish({ ok: false, error: event.error });
            return;
          }

          const index = STAGE_INDEX.get(stage);
          if (index === undefined) return;

          setState((prev) => ({
            ...prev,
            status: "streaming",
            activeStage: stage,
            // Stages before this one are now genuinely complete.
            reachedIndex: Math.max(prev.reachedIndex, index),
            detail: {
              ...prev.detail,
              // Only values the backend sent. Absent means not shown.
              ...(event.document_count !== undefined && {
                documentCount: event.document_count,
              }),
              ...(event.scope !== undefined && { scope: event.scope }),
              ...(event.passage_count !== undefined && {
                passageCount: event.passage_count,
              }),
              ...(event.documents !== undefined && { documents: event.documents }),
            },
          }));
        },
        onError: (message) => {
          setState((prev) => ({
            ...prev,
            status: "failed",
            activeStage: null,
            error: message,
          }));
          finish({ ok: false, error: message });
        },
      });

      abortRef.current = () => {
        abort();
        finish({ ok: false, cancelled: true });
      };
    });
  }, []);

  return { ...state, ask, cancel, reset };
}
