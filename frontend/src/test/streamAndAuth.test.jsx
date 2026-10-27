import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { studyApi } from "@/services/api";
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from "@/services/http";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";

function sseResponse(frames, status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      frames.forEach((frame) => controller.enqueue(encoder.encode(frame)));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

function runStream() {
  return new Promise((resolve) => {
    const stages = [];
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    studyApi.askStream(
      { question: "q" },
      {
        onStage: (event) => {
          stages.push(event.stage);
          if (event.stage === "completed") done({ stages, error: null });
        },
        onError: (error) => done({ stages, error }),
      }
    );
    setTimeout(() => done({ stages, error: null, timedOut: true }), 500);
  });
}

const fakeJwt = (claims) =>
  `h.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.s`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setAccessToken(null);
  setUnauthorizedHandler(null);
});

describe("askStream", () => {
  it("reports an error when the stream closes without a terminal event", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(['data: {"stage":"preparing"}\n\n'])));
    const outcome = await runStream();
    expect(outcome.stages).toEqual(["preparing"]);
    expect(outcome.error).toBe("The connection closed before the answer finished.");
  });

  it("does not report an error after a completed event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          'data: {"stage":"preparing"}\n\n',
          'data: {"stage":"completed","result":{"answer":"A"}}\n\n',
        ])
      )
    );
    const outcome = await runStream();
    expect(outcome.stages).toEqual(["preparing", "completed"]);
    expect(outcome.error).toBeNull();
  });

  it("routes a 401 through the shared unauthorized handler", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const outcome = await runStream();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(outcome.error).toBeTruthy();
  });

  it("omits the Authorization header when there is no token", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse(['data: {"stage":"completed","result":{}}\n\n'])
    );
    vi.stubGlobal("fetch", fetchMock);
    await runStream();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});

function AuthProbe() {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{isAuthenticated ? `signed in ${user?.email}` : "signed out"}</p>;
}

describe("AuthProvider session check", () => {
  it("keeps the session when /auth/me fails for a non-401 reason", async () => {
    setAccessToken(fakeJwt({ sub: "1", email: "a@example.com" }), 3600);
    const { authApi } = await import("@/services/api");
    vi.spyOn(authApi, "me").mockRejectedValue({ response: { status: 500 } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("signed in a@example.com")).toBeInTheDocument());
    expect(getAccessToken()).not.toBeNull();
  });

  it("clears the session when /auth/me returns 401", async () => {
    setAccessToken(fakeJwt({ sub: "1", email: "a@example.com" }), 3600);
    const { authApi } = await import("@/services/api");
    vi.spyOn(authApi, "me").mockRejectedValue({ response: { status: 401 } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
    expect(getAccessToken()).toBeNull();
  });
});
