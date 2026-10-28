import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { ThinkingStage } from "@/components/wait";
import { Button } from "@/components/ui/button";
import { EASE_DRAW, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import AnswerProgress from "./AnswerProgress";
import Citations from "./Citations";
import StudyHero from "./StudyHero";
import { detailFor } from "./stageText";
import { STAGES } from "./useAnswerStream";

const markdownComponents = {
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-[square] space-y-1.5 marker:text-primary last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1.5 marker:font-mono marker:text-[0.8em] marker:font-semibold marker:text-primary last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-7 font-display text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.015em] text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-7 font-display text-[1.4rem] font-semibold leading-[1.15] tracking-[-0.015em] text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1.5 mt-5 font-display text-[1.15rem] font-semibold italic leading-snug text-foreground first:mt-0">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-1.5 mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary first:mt-0">
      {children}
    </h5>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="font-display italic">{children}</em>,
  hr: () => <hr className="my-6 border-0 border-t border-border" />,
  code: ({ inline, className, children }) =>
    inline || !className ? (
      <code className="rounded-[5px] border border-border bg-surface-sunk px-1.5 py-0.5 font-mono text-[0.82em] text-foreground">
        {children}
      </code>
    ) : (
      <code className="block overflow-x-auto whitespace-pre-wrap rounded-control border-2 border-border-strong bg-surface-sunk p-3 font-mono text-[0.82em] leading-relaxed">
        {children}
      </code>
    ),
  pre: ({ children }) => <pre className="mb-4 last:mb-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-[3px] border-primary pl-4 font-display text-[1.05em] italic text-foreground/85">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline decoration-2 underline-offset-4 hover:decoration-citron"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-control border-2 border-border-strong last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b-2 border-border-strong bg-surface-sunk px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-t border-border px-3 py-2 align-top">{children}</td>,
};

const pad = (value) => String(value).padStart(2, "0");

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const GRID = "grid gap-x-6 md:grid-cols-[60px_minmax(0,1fr)] min-[1400px]:grid-cols-[56px_minmax(0,1fr)_220px]";

function QuestionCard({ content, number, reduced }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12, rotate: 0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={GRID}
    >
      <div className="flex justify-end md:col-start-2 min-[1400px]:col-span-2">
        <div className="relative ml-6 max-w-[min(560px,100%)] pt-3">
          <span className="absolute -top-0.5 left-4 z-10 inline-flex -rotate-2 items-center rounded-[6px] border-2 border-black bg-citron px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-citron-foreground shadow-hs-sm">
            Q.{pad(number)}
          </span>
          <div className="rounded-card border-2 border-border-strong bg-ink px-5 pb-4 pt-5 text-bone shadow-hs dark:bg-bone dark:text-ink">
            <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Meta({ number, label, items, tone = "primary" }) {
  const visible = items.filter(Boolean);
  return (
    <div className="mb-3 flex items-center gap-3 md:mb-0 md:block md:pt-1">
      <p
        className={cn(
          "font-mono text-[13px] font-semibold tracking-[0.04em] tabular",
          tone === "primary" ? "text-primary" : "text-destructive"
        )}
      >
        {label}.{pad(number)}
      </p>
      <span aria-hidden="true" className="h-px flex-1 bg-border md:my-2.5 md:block md:h-0.5 md:w-6 md:flex-none md:bg-border-strong" />
      <ul className="flex shrink-0 flex-wrap gap-x-2.5 font-mono text-[10.5px] uppercase leading-5 tracking-[0.06em] text-muted-foreground md:block">
        {visible.map((item) => (
          <li key={item} className="tabular">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerBlock({ message, number, onRetry, reduced }) {
  const fresh = message.fresh && !reduced;
  const sources = message.sources ?? [];
  const meta = [
    message.marks ? `${message.marks} marks` : null,
    sources.length ? `${sources.length} src` : null,
    formatTime(message.createdAt),
  ];

  if (message.error) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className={GRID}
      >
        <Meta number={number} label="A" items={["no answer"]} tone="destructive" />
        <div className="min-w-0 max-w-[68ch]">
          <div className="rounded-card border-2 border-destructive bg-destructive-soft px-4 py-3.5 shadow-hs-sm">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{message.content}</p>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
                    <RefreshCw aria-hidden="true" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.article
      initial={fresh ? { opacity: 0, y: 22, clipPath: "inset(0% 0% 100% 0%)" } : reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", transitionEnd: { clipPath: "none" } }}
      transition={fresh ? { duration: 0.7, ease: EASE_DRAW, delay: 0.05 } : { duration: 0.3, ease: EASE_OUT }}
      className={GRID}
      aria-label={`Answer ${number}`}
    >
      <Meta number={number} label="A" items={meta} />
      <div className="min-w-0">
        <motion.div
          aria-hidden="true"
          className="mb-5 h-0.5 origin-left bg-border-strong"
          initial={fresh ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: EASE_DRAW, delay: 0.2 }}
        />
        <div className="max-w-[68ch] break-words text-[15.5px] leading-[1.72] text-foreground/90">
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
        </div>
      </div>
      {sources.length > 0 && (
        <Citations
          sources={sources}
          className="mt-7 md:col-start-2 min-[1400px]:col-start-3 min-[1400px]:row-start-1 min-[1400px]:mt-0 min-[1400px]:border-l min-[1400px]:border-border min-[1400px]:pl-5 min-[1400px]:pt-1"
        />
      )}
    </motion.article>
  );
}

function PendingBlock({ stream, number, startedAt, reduced, className, anchorRef }) {
  const stage = stream.activeStage;
  const meta = STAGES.find((item) => item.id === stage);

  return (
    <motion.div
      ref={anchorRef}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.1 } }
          : { opacity: 0, scale: 0.97, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
      }
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(GRID, className)}
    >
      <Meta number={number} label="A" items={["drafting"]} />
      <div className="min-w-0">
        <ThinkingStage
          stage={stage ?? "preparing"}
          stageLabel={meta?.label ?? "Sending your question"}
          detail={detailFor(stage, stream.detail) ?? undefined}
          startedAt={startedAt ?? undefined}
          mode="answer"
        />
      </div>
      <AnswerProgress
        activeStage={stage}
        reachedIndex={stream.reachedIndex}
        detail={stream.detail}
        className="mt-6 md:col-start-2 min-[1400px]:col-start-3 min-[1400px]:row-start-1 min-[1400px]:mt-0 min-[1400px]:border-l min-[1400px]:border-border min-[1400px]:pl-5 min-[1400px]:pt-1"
      />
    </motion.div>
  );
}

export default function Transcript({
  messages,
  stream,
  pendingStartedAt,
  onSuggestion,
  onRetry,
  canAsk,
  documentCount,
}) {
  const viewportRef = useRef(null);
  const pendingRef = useRef(null);
  const reduced = useReducedMotion();
  const isStreaming = stream.status === "streaming";

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const anchor = isStreaming ? pendingRef.current : null;
    const top = anchor ? Math.max(0, anchor.offsetTop - 120) : node.scrollHeight;
    node.scrollTo({
      top,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages, stream.status, stream.activeStage, reduced, isStreaming]);

  const empty = messages.length === 0 && !isStreaming;

  let questionCount = 0;
  const numbered = messages.map((message) => {
    if (message.role === "user") questionCount += 1;
    return { message, number: Math.max(questionCount, 1) };
  });

  return (
    <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <div className="mx-auto w-full max-w-[1040px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-10">
        {empty && <StudyHero canAsk={canAsk} onSuggestion={onSuggestion} documentCount={documentCount} />}

        {!empty && (
          <div aria-live="polite" aria-atomic="false" className="space-y-10 sm:space-y-12">
            {numbered.map(({ message, number }, index) =>
              message.role === "user" ? (
                <QuestionCard
                  key={message.id ?? `u-${index}`}
                  content={message.content}
                  number={number}
                  reduced={reduced}
                />
              ) : (
                <AnswerBlock
                  key={message.id ?? `a-${index}`}
                  message={message}
                  number={number}
                  reduced={reduced}
                  onRetry={message.error && index === messages.length - 1 ? onRetry : undefined}
                />
              )
            )}
          </div>
        )}

        <AnimatePresence>
          {isStreaming && (
            <PendingBlock
              key="pending"
              anchorRef={pendingRef}
              stream={stream}
              number={Math.max(questionCount, 1)}
              startedAt={pendingStartedAt}
              reduced={reduced}
              className="mt-10 sm:mt-12"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
