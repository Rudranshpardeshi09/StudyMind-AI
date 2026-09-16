/**
 * Composer behaviour, document status display, and citation rendering.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AnswerProgress from "@/features/study/AnswerProgress";
import Citations from "@/features/study/Citations";
import Composer from "@/features/study/Composer";
import { StatusIndicator, ProgressBar, ErrorState } from "@/components/ui/primitives";

describe("Composer", () => {
  it("sends on Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    await user.type(screen.getByRole("textbox"), "What is mitosis?");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("What is mitosis?");
  });

  it("inserts a newline on Shift+Enter instead of sending", async () => {
    // The old composer was an <input>, so this was impossible despite being
    // documented in the UI.
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    const box = screen.getByRole("textbox");
    await user.type(box, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(box, "line two");

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("line one\nline two");
  });

  it("does not send blank or whitespace-only input", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    await user.type(screen.getByRole("textbox"), "   ");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows a counter near the limit and refuses to send when over it", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={onSend} />);

    const box = screen.getByRole("textbox");
    await user.click(box);
    await user.paste("x".repeat(1001));

    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("1 characters too long");

    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("restores a draft after a failed send", () => {
    // A failed turn must never lose what the student typed.
    render(<Composer onSend={vi.fn()} restoreValue="my lost question" />);
    expect(screen.getByRole("textbox")).toHaveValue("my lost question");
  });

  it("offers Stop while a generation is running", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSend={vi.fn()} onCancel={onCancel} busy />);

    await user.click(screen.getByRole("button", { name: /stop/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("explains itself when disabled", () => {
    render(<Composer onSend={vi.fn()} disabled disabledReason="Add a document first" />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByPlaceholderText("Add a document first")).toBeInTheDocument();
  });
});

describe("StatusIndicator", () => {
  it.each([
    ["queued", "Queued"],
    ["parsing", "Reading"],
    ["embedding", "Indexing"],
    ["ready", "Ready"],
    ["failed", "Failed"],
  ])("labels %s as %s", (status, label) => {
    render(<StatusIndicator status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("falls back to a known label for an unexpected status", () => {
    render(<StatusIndicator status="something-new" />);
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });
});

describe("ProgressBar", () => {
  it("exposes a real measured value to assistive technology", () => {
    render(<ProgressBar value={42} label="Uploading notes.pdf" />);
    const bar = screen.getByRole("progressbar", { name: "Uploading notes.pdf" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("clamps out-of-range input rather than rendering nonsense", () => {
    render(<ProgressBar value={140} label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("Citations", () => {
  const sources = [
    { document_name: "biology.pdf", page: 42, text: "Photosynthesis converts light.", chunk_id: "c1" },
    { document_name: "history.pdf", page: 7, text: "The revolution began.", chunk_id: "c2" },
  ];

  it("names the document and page without needing a click", () => {
    // Citations are the product's trust claim, so they are visible by default.
    render(<Citations sources={sources} />);
    expect(screen.getByText("2 sources")).toBeInTheDocument();
    expect(screen.getByText("biology.pdf")).toBeInTheDocument();
    expect(screen.getByText("p.42")).toBeInTheDocument();
  });

  it("reveals the quoted passage when expanded", async () => {
    const user = userEvent.setup();
    render(<Citations sources={sources} />);

    expect(screen.queryByText(/Photosynthesis converts light/)).not.toBeInTheDocument();
    await user.click(screen.getByText("biology.pdf").closest("button"));
    expect(screen.getByText(/Photosynthesis converts light/)).toBeInTheDocument();
  });

  it("renders nothing when an answer has no sources", () => {
    const { container } = render(<Citations sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AnswerProgress", () => {
  it("shows only stages that have been reached", () => {
    render(<AnswerProgress activeStage="retrieving" reachedIndex={1} detail={{}} />);
    expect(screen.getByText("Understanding your question")).toBeInTheDocument();
    expect(screen.getByText("Searching your study material")).toBeInTheDocument();
    // Future stages are absent — the list must not read as a progress bar.
    expect(screen.queryByText("Building your answer")).not.toBeInTheDocument();
    expect(screen.queryByText("Checking citations")).not.toBeInTheDocument();
  });

  it("shows a count only when the backend supplied one", () => {
    const { rerender } = render(
      <AnswerProgress activeStage="generating" reachedIndex={3} detail={{}} />
    );
    expect(screen.queryByText(/relevant passage/)).not.toBeInTheDocument();

    rerender(
      <AnswerProgress
        activeStage="generating"
        reachedIndex={3}
        detail={{ passageCount: 6, documents: ["biology.pdf"] }}
      />
    );
    expect(
      screen.getByText("Found 6 relevant passages from biology.pdf")
    ).toBeInTheDocument();
  });

  it("never renders a percentage", () => {
    const { container } = render(
      <AnswerProgress
        activeStage="generating"
        reachedIndex={3}
        detail={{ passageCount: 6, documentCount: 3 }}
      />
    );
    expect(container.textContent).not.toMatch(/\d+\s*%/);
  });
});

describe("ErrorState", () => {
  it("states the problem and offers a way forward", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState message="Cannot reach the server." onRetry={onRetry} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Cannot reach the server.")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
