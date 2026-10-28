import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  FileText,
  GraduationCap,
  Library,
  MessageSquare,
  Network,
} from "lucide-react";

import { BigNumeral, Cube3D, OrbitRings, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  Marginalia,
  SkeletonList,
  StatusIndicator,
} from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";
import { useDocuments } from "@/features/library/DocumentsContext";
import { chatApi, mindMapsApi } from "@/services/api";
import { clipReveal, pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

function formatWhen(value) {
  if (!value) return "";
  const parsed = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  const minutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const pad = (value) => String(value).padStart(2, "0");

function SmallTile({ label, value, hint, tone = "neutral", className }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-4 sm:p-5",
        className
      )}
    >
      <p className="eyebrow">{label}</p>
      <div>
        <p
          className={cn(
            "display tabular text-5xl",
            tone === "warning" ? "text-primary" : "text-foreground"
          )}
        >
          {pad(value)}
        </p>
        {hint && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {tone === "live" && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-info opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-info" />
              </span>
            )}
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ number, eyebrow, title, to, linkLabel }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-border-strong pb-3">
      <div className="min-w-0">
        <Eyebrow number={number} className="mb-1.5">
          {eyebrow}
        </Eyebrow>
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.015em] text-foreground">
          {title}
        </h3>
      </div>
      {to && (
        <Button variant="ghost" size="sm" asChild className="shrink-0 max-sm:h-11">
          <Link to={to}>
            {linkLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function StackItem({ to, index, title, meta, icon: Icon }) {
  return (
    <li
      className={cn(
        "relative",
        index === 1 && "sm:ml-4",
        index === 2 && "sm:ml-8",
        index === 3 && "sm:ml-4",
        index >= 4 && "sm:ml-0"
      )}
    >
      <Link
        to={to}
        className={cn(
          "group flex min-h-[64px] items-center gap-3 rounded-card border-2 border-border-strong bg-surface px-4 py-3",
          "transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-hs-lg motion-reduce:transform-none",
          index === 0 ? "bg-surface-raised shadow-hs" : "shadow-hs-sm"
        )}
      >
        <span className="font-mono text-[11px] font-semibold text-primary">{pad(index + 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{meta}</span>
          </span>
        </span>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function StackShell({ children }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-x-3 -bottom-2 top-3 -z-0 rounded-card border border-dashed border-border"
      />
      <ul className="relative space-y-3">{children}</ul>
    </div>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { documents, ready, processing, failed, loading } = useDocuments();
  const navigate = useNavigate();
  const m = useReducedMotionSafe();

  const [sessions, setSessions] = useState([]);
  const [maps, setMaps] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      try {
        const [sessionList, mapList] = await Promise.all([
          chatApi.list(),
          mindMapsApi.list(),
        ]);
        if (cancelled) return;
        setSessions(sessionList);
        setMaps(mapList);
        setActivityError(null);
      } catch {
        if (!cancelled) setActivityError("Could not load your recent activity.");
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(() => {
    const local = user?.email?.split("@")[0]?.split(/[._-]/)[0] ?? "";
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
  }, [user]);

  const passages = useMemo(
    () => ready.reduce((sum, doc) => sum + (Number(doc.chunk_count) || 0), 0),
    [ready]
  );

  const steps = [
    {
      id: "upload",
      label: "Upload a document",
      hint: "PDF or Word, straight into your library",
      done: documents.length > 0,
      action: () => navigate("/library"),
    },
    {
      id: "index",
      label: "Wait for indexing to finish",
      hint: "We read and embed every page",
      done: ready.length > 0,
      action: () => navigate("/library"),
    },
    {
      id: "ask",
      label: "Ask your first question",
      hint: "Answers come back with citations",
      done: sessions.length > 0,
      action: () => navigate("/study"),
    },
    {
      id: "map",
      label: "Generate a mind map",
      hint: "Turn a document into a diagram",
      done: maps.length > 0,
      action: () => navigate("/mind-maps"),
    },
  ];
  const remaining = steps.filter((step) => !step.done);
  const nextStep = remaining[0];
  const doneCount = steps.length - remaining.length;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
      <motion.div
        variants={m.variants(pageEnter)}
        initial={m.initial}
        animate="show"
        className="mx-auto max-w-shell space-y-12 px-4 py-8 sm:px-6 lg:space-y-16 lg:px-10 lg:py-12"
      >
        <header className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <motion.div variants={m.variants(riseIn)}>
              <Eyebrow number={1} className="mb-4">
                Today&apos;s edition
              </Eyebrow>
            </motion.div>
            <motion.h2
              variants={m.variants(clipReveal)}
              className="display text-display-lg text-foreground"
            >
              Welcome back,
              <br />
              <em className="display-italic text-primary">{firstName}.</em>
            </motion.h2>
            <motion.p
              variants={m.variants(riseIn)}
              className="mt-5 max-w-[52ch] text-base text-muted-foreground sm:text-lg"
            >
              {nextStep
                ? "Pick up where you left off, or finish setting up your workspace."
                : "Everything is set up. Continue studying whenever you are ready."}
            </motion.p>
            <motion.div variants={m.variants(riseIn)} className="mt-7 flex flex-wrap items-center gap-3">
              {nextStep ? (
                <Button size="lg" arrow onClick={nextStep.action}>
                  {nextStep.label}
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/study">
                    Continue studying
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild>
                <Link to="/tutorial">
                  <GraduationCap aria-hidden="true" />
                  How it works
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            variants={m.variants(riseIn)}
            className="hidden min-w-0 lg:col-span-3 lg:col-start-10 lg:flex lg:flex-col lg:justify-end"
          >
            <div className="relative mx-auto mb-4 flex size-[200px] items-center justify-center">
              <OrbitRings size={200} active={processing.length > 0} />
              <Cube3D size={44} speed={processing.length > 0 ? 2.5 : 0.8} className="absolute -right-1 top-2" />
            </div>
            <Marginalia label="Fig. 1 — Your index">
              {ready.length} {ready.length === 1 ? "document" : "documents"} ready,{" "}
              {passages} passages orbiting the core.
              {processing.length > 0 && ` ${processing.length} more being indexed now.`}
            </Marginalia>
          </motion.div>
        </header>

        <motion.section variants={m.variants(riseIn)} aria-label="At a glance">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
            <Card
              variant="brutal"
              className="col-span-2 flex min-h-[260px] flex-col justify-between overflow-hidden p-5 sm:p-7 lg:col-span-5 lg:row-span-2"
            >
              <div className="flex items-start justify-between gap-3">
                <Eyebrow number={2}>Ready to study</Eyebrow>
                {processing.length > 0 && (
                  <Sticker tone="citron" rotate={4}>
                    {processing.length} cooking
                  </Sticker>
                )}
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <BigNumeral value={ready.length} size="lg" className="block text-foreground" />
                  <p className="sr-only">{ready.length}</p>
                  <p className="mt-2 font-display text-xl font-semibold text-foreground">
                    documents <em className="display-italic text-primary">indexed</em>
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    {passages} passages searchable
                  </p>
                </div>
                <Button variant="secondary" size="icon" asChild className="shrink-0">
                  <Link to="/library" aria-label="Open library">
                    <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </Card>
            <SmallTile
              label="Processing"
              value={processing.length}
              hint={processing.length ? "indexing now" : "nothing queued"}
              tone={processing.length ? "live" : "neutral"}
              className="lg:col-span-4"
            />
            <SmallTile
              label="Needs attention"
              value={failed.length}
              hint={failed.length ? "failed to index" : "no failures"}
              tone={failed.length ? "warning" : "neutral"}
              className={cn("lg:col-span-3", failed.length && "border-2 border-primary")}
            />
            <SmallTile
              label="Saved chats"
              value={sessions.length}
              hint="conversations"
              className="lg:col-span-3"
            />
            <SmallTile
              label="Mind maps"
              value={maps.length}
              hint="saved diagrams"
              className="lg:col-span-4"
            />
          </div>
        </motion.section>

        {failed.length > 0 && (
          <motion.div
            variants={m.variants(riseIn)}
            role="alert"
            className="relative flex flex-col gap-4 rounded-card border-2 border-border-strong bg-surface-raised p-5 shadow-hs sm:flex-row sm:items-center"
          >
            <Sticker tone="cherry" rotate={-5} className="self-start">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Heads up
            </Sticker>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-semibold text-foreground">
                {failed.length} document{failed.length === 1 ? "" : "s"} failed to index
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Library to see why and retry them.
              </p>
            </div>
            <Button variant="secondary" arrow onClick={() => navigate("/library")}>
              Open library
            </Button>
          </motion.div>
        )}

        {remaining.length > 0 && (
          <motion.section variants={m.variants(riseIn)} className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow number={3} className="mb-3">
                Getting started
              </Eyebrow>
              <h3 className="display text-display-sm text-foreground">
                Four steps to a <em className="display-italic text-primary">sharper</em> brain.
              </h3>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {doneCount} of {steps.length} done
              </p>
              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {steps.map((step) => (
                  <span
                    key={step.id}
                    className={cn(
                      "h-2 flex-1 rounded-full border-[1.5px] border-border-strong",
                      step.done ? "bg-primary" : "bg-surface-sunk"
                    )}
                  />
                ))}
              </div>
            </div>
            <ol className="border-t-2 border-border-strong lg:col-span-8">
              {steps.map((step, index) => (
                <li key={step.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={step.action}
                    className="group flex min-h-[76px] w-full items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-surface sm:gap-6 sm:px-3"
                  >
                    <span
                      className={cn(
                        "w-12 shrink-0 font-display text-4xl font-semibold leading-none tracking-[-0.03em] sm:w-16 sm:text-5xl",
                        step.done ? "text-foreground/20" : "text-foreground"
                      )}
                    >
                      {pad(index + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-base font-semibold sm:text-lg",
                          step.done
                            ? "text-muted-foreground line-through decoration-primary decoration-2"
                            : "text-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{step.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[8px] border-2 border-border-strong transition-[transform,box-shadow] duration-150",
                        step.done
                          ? "bg-primary text-primary-foreground shadow-hs-sm"
                          : "bg-surface group-hover:-translate-x-px group-hover:-translate-y-px group-hover:shadow-hs-sm"
                      )}
                    >
                      {step.done ? (
                        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                      ) : (
                        <ArrowRight className="size-4 text-foreground" aria-hidden="true" />
                      )}
                      <span className="sr-only">{step.done ? "Done" : "To do"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </motion.section>
        )}

        {activityError && <ErrorState message={activityError} />}

        <motion.section variants={m.variants(riseIn)} className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <SectionHeading
              number={remaining.length > 0 ? 4 : 3}
              eyebrow="Recent sessions"
              title="Where you left off"
              to="/study"
              linkLabel="Open"
            />
            {activityLoading ? (
              <SkeletonList rows={3} />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                art="orbit"
                artSize={96}
                title="No chats yet"
                description="Your conversations appear here once you ask a question."
                className="py-8"
              />
            ) : (
              <StackShell>
                {sessions.slice(0, 5).map((session, index) => (
                  <StackItem
                    key={session.id}
                    index={index}
                    to={`/study?session=${encodeURIComponent(session.id)}`}
                    title={session.title}
                    meta={formatWhen(session.updated_at)}
                    icon={Clock}
                  />
                ))}
              </StackShell>
            )}
          </div>

          <div className="min-w-0 lg:col-span-5 lg:mt-16">
            <SectionHeading
              number={remaining.length > 0 ? 5 : 4}
              eyebrow="Recent mind maps"
              title="Maps on the wall"
              to="/mind-maps"
              linkLabel="Open"
            />
            {activityLoading ? (
              <SkeletonList rows={3} />
            ) : maps.length === 0 ? (
              <EmptyState
                icon={Network}
                art="cube"
                artSize={80}
                title="No mind maps yet"
                description="Turn a document into a visual summary to revise from."
                className="py-8"
              />
            ) : (
              <StackShell>
                {maps.slice(0, 5).map((map, index) => (
                  <StackItem
                    key={map.id}
                    index={index}
                    to={`/mind-maps?id=${encodeURIComponent(map.id)}`}
                    title={map.title}
                    meta={map.source}
                    icon={FileText}
                  />
                ))}
              </StackShell>
            )}
          </div>
        </motion.section>

        <motion.section variants={m.variants(riseIn)} className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8 lg:col-start-3">
            <SectionHeading
              number={remaining.length > 0 ? 6 : 5}
              eyebrow="On the shelf"
              title="Documents"
              to="/library"
              linkLabel="Manage"
            />
            {loading && documents.length === 0 ? (
              <SkeletonList rows={2} />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nothing uploaded yet"
                description="Add a PDF or Word document to unlock studying and mind maps."
                action={
                  <Button asChild>
                    <Link to="/library">Upload a document</Link>
                  </Button>
                }
                className="py-8"
              />
            ) : (
              <ul>
                {documents.slice(0, 5).map((document, index) => (
                  <li
                    key={document.id}
                    className="flex min-h-[52px] items-center gap-3 border-b border-border py-2.5 sm:gap-4"
                  >
                    <span className="w-6 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {pad(index + 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
                      {document.original_name}
                    </span>
                    <StatusIndicator status={document.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>

        <motion.nav
          variants={m.variants(riseIn)}
          aria-label="Shortcuts"
          className="grid gap-4 border-t-2 border-border-strong pt-8 sm:grid-cols-3"
        >
          {[
            { to: "/library", label: "Upload material", note: "Add PDFs and Word files", icon: Library },
            { to: "/study", label: "Ask a question", note: "Cited answers from your notes", icon: BookOpen },
            { to: "/tutorial", label: "How it works", note: "A five-minute guide", icon: GraduationCap },
          ].map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative flex min-h-[88px] items-center gap-4 rounded-card border-2 border-border-strong bg-surface p-4 shadow-hs transition-[transform,box-shadow] duration-150 ease-out hover:-translate-x-px hover:-translate-y-px hover:shadow-hs-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-hs-press motion-reduce:transform-none"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-control border-2 border-black",
                  index === 0 && "bg-primary text-primary-foreground",
                  index === 1 && "bg-citron text-citron-foreground",
                  index === 2 && "bg-ink text-bone dark:bg-bone dark:text-ink"
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{item.label}</span>
                <span className="block truncate text-sm text-muted-foreground">{item.note}</span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          ))}
        </motion.nav>
      </motion.div>
    </div>
  );
}
