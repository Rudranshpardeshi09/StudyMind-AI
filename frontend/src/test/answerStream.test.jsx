import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STAGES, useAnswerStream } from "@/features/study/useAnswerStream";

const handlers = {};

vi.mock("@/services/api", () => ({
  studyApi: {
    askStream: (payload, { onStage, onError }) => {
      handlers.onStage = onStage;
      handlers.onError = onError;
      handlers.aborted = false;
      return () => {
        handlers.aborted = true;
      };
    },
  },
}));

const emit = (event) => act(() => handlers.onStage(event));

describe("useAnswerStream", () => {
  beforeEach(() => {
    handlers.onStage = undefined;
    handlers.onError = undefined;
  });

  it("starts idle with nothing reached", () => {
    const { result } = renderHook(() => useAnswerStream());
    expect(result.current.status).toBe("idle");
    expect(result.current.reachedIndex).toBe(-1);
    expect(result.current.activeStage).toBeNull();
  });

  it("only advances when the backend says so", () => {
    const { result } = renderHook(() => useAnswerStream());
    act(() => {
      result.current.ask({ question: "q" });
    });
    expect(result.current.status).toBe("streaming");
    expect(result.current.reachedIndex).toBe(-1);

    emit({ stage: "preparing" });
    expect(result.current.activeStage).toBe("preparing");
    expect(result.current.reachedIndex).toBe(0);

    emit({ stage: "retrieving", document_count: 3, scope: "selected" });
    expect(result.current.activeStage).toBe("retrieving");
    expect(result.current.reachedIndex).toBe(1);
    expect(result.current.detail.documentCount).toBe(3);
  });

  it("never regresses past a stage already reached", () => {
    const { result } = renderHook(() => useAnswerStream());
    act(() => {
      result.current.ask({ question: "q" });
    });
    emit({ stage: "analyzing" });
    const reached = result.current.reachedIndex;
    emit({ stage: "preparing" });
    expect(result.current.reachedIndex).toBe(reached);
  });

  it("only records counts the backend actually sent", () => {
    const { result } = renderHook(() => useAnswerStream());
    act(() => {
      result.current.ask({ question: "q" });
    });
    emit({ stage: "generating" });
    expect(result.current.detail.passageCount).toBeUndefined();

    emit({ stage: "generating", passage_count: 6, documents: ["bio.pdf"] });
    expect(result.current.detail.passageCount).toBe(6);
    expect(result.current.detail.documents).toEqual(["bio.pdf"]);
  });

  it("resolves with the result once completed", async () => {
    const { result } = renderHook(() => useAnswerStream());
    let promise;
    act(() => {
      promise = result.current.ask({ question: "q" });
    });
    emit({ stage: "preparing" });
    emit({ stage: "completed", result: { answer: "A", sources: [] } });

    await expect(promise).resolves.toEqual({
      ok: true,
      result: { answer: "A", sources: [] },
    });
    expect(result.current.status).toBe("completed");
    expect(result.current.reachedIndex).toBe(STAGES.length);
  });

  it("surfaces a backend failure without completing any further stage", async () => {
    const { result } = renderHook(() => useAnswerStream());
    let promise;
    act(() => {
      promise = result.current.ask({ question: "q" });
    });
    emit({ stage: "preparing" });
    emit({ stage: "failed", error: "No documents are ready yet." });

    await expect(promise).resolves.toEqual({
      ok: false,
      error: "No documents are ready yet.",
    });
    expect(result.current.status).toBe("failed");
    expect(result.current.reachedIndex).toBe(0);
  });

  it("reports a transport error as a failure, not a completion", async () => {
    const { result } = renderHook(() => useAnswerStream());
    let promise;
    act(() => {
      promise = result.current.ask({ question: "q" });
    });
    act(() => handlers.onError("The connection dropped."));
    await expect(promise).resolves.toEqual({
      ok: false,
      error: "The connection dropped.",
    });
    expect(result.current.status).toBe("failed");
  });

  it("aborts the request when cancelled", async () => {
    const { result } = renderHook(() => useAnswerStream());
    let promise;
    act(() => {
      promise = result.current.ask({ question: "q" });
    });
    act(() => result.current.cancel());
    await expect(promise).resolves.toEqual({ ok: false, cancelled: true });
    expect(handlers.aborted).toBe(true);
    expect(result.current.status).toBe("cancelled");
  });

  it("aborts the request when the component unmounts", async () => {
    const { result, unmount } = renderHook(() => useAnswerStream());
    let promise;
    act(() => {
      promise = result.current.ask({ question: "q" });
    });
    unmount();
    await expect(promise).resolves.toEqual({ ok: false, cancelled: true });
    expect(handlers.aborted).toBe(true);
  });
});
