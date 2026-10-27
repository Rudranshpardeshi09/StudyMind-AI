import { useCallback, useEffect, useRef, useState } from "react";

import { studyApi } from "@/services/api";

export const STAGES = [
  { id: "preparing", label: "Understanding your question" },
  { id: "retrieving", label: "Searching your study material" },
  { id: "analyzing", label: "Finding relevant sections" },
  { id: "generating", label: "Building your answer" },
  { id: "validating", label: "Preparing citations" },
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
  const [state, setStateRaw] = useState(IDLE);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const setState = useCallback((update) => {
    if (mountedRef.current) setStateRaw(update);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.();
      abortRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setState(IDLE);
  }, [setState]);

  const cancel = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setState((prev) => ({ ...prev, status: "cancelled", activeStage: null }));
  }, [setState]);

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
              reachedIndex: STAGES.length,
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
            reachedIndex: Math.max(prev.reachedIndex, index),
            detail: {
              ...prev.detail,
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
  }, [setState]);

  return { ...state, ask, cancel, reset };
}
