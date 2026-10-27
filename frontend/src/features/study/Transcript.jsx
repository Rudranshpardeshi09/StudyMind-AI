import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import AnswerProgress from "./AnswerProgress";
import Citations from "./Citations";

const SUGGESTIONS = [
  "Summarise the key concepts in this material",
  "Explain the most important topic in simple terms",
  "What are the main definitions I should memorise?",
  "Give me three likely exam questions from this",
];

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-2.5 font-semibold first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded bg-surface-sunk px-1 py-0.5 text-[0.85em]">{children}</code>
    ) : (
      <code className="block overflow-x-auto whitespace-pre-wrap rounded bg-surface-sunk p-2 text-[0.85em]">
        {children}
      </code>
    ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border-strong pl-3 italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
};

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ message, onRetry }) {
  if (message.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive-soft px-3.5 py-3">
        <div className="flex gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-destructive">{message.content}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10"
              >
                <RefreshCw aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <div className="text-sm leading-relaxed text-foreground">
        <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
      </div>
      <Citations sources={message.sources} />
    </div>
  );
}

export default function Transcript({
  messages,
  stream,
  pendingStartedAt,
  onSuggestion,
  onRetry,
  onCancel,
  canAsk,
}) {
  const viewportRef = useRef(null);
  const reduced = useReducedMotion();
  const isStreaming = stream.status === "streaming";

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages, stream.status, stream.activeStage, reduced]);

  const empty = messages.length === 0 && !isStreaming;

  return (
    <div
      ref={viewportRef}
      className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="mx-auto max-w-3xl space-y-3 p-3 sm:p-4">
        {empty && (
          <div className="pt-6">
            <EmptyState
              icon={Sparkles}
              title={canAsk ? "Ask anything about your material" : "No documents ready yet"}
              description={
                canAsk
                  ? "Answers are grounded in the documents you selected, and every one cites where it came from."
                  : "Upload a PDF or DOCX in the Library and wait for indexing to finish."
              }
            />
            {canAsk && (
              <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSuggestion(suggestion)}
                    className="rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <motion.div
              key={message.id ?? `u-${index}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <UserMessage content={message.content} />
            </motion.div>
          ) : (
            <motion.div
              key={message.id ?? `a-${index}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <AssistantMessage
                message={message}
                onRetry={message.error && index === messages.length - 1 ? onRetry : undefined}
              />
            </motion.div>
          )
        )}

        <AnimatePresence>
          {isStreaming && (
            <AnswerProgress
              key="progress"
              activeStage={stream.activeStage}
              reachedIndex={stream.reachedIndex}
              detail={stream.detail}
              startedAt={pendingStartedAt}
              onCancel={onCancel}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
