import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileText,
  GraduationCap,
  Library,
  MessageSquare,
  Network,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonList,
  StatusIndicator,
} from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";
import { useDocuments } from "@/features/library/DocumentsContext";
import { chatApi, mindMapsApi } from "@/services/api";
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

function StatTile({ label, value, hint, tone = "neutral" }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-2xl font-semibold",
          tone === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ListCard({ title, icon: Icon, to, linkLabel, children }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to={to}>
            {linkLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </Card>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { documents, ready, processing, failed, loading } = useDocuments();
  const navigate = useNavigate();

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
    const local = user?.email?.split("@")[0] ?? "";
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
  }, [user]);

  const steps = [
    {
      id: "upload",
      label: "Upload a document",
      done: documents.length > 0,
      action: () => navigate("/library"),
    },
    {
      id: "index",
      label: "Wait for indexing to finish",
      done: ready.length > 0,
      action: () => navigate("/library"),
    },
    {
      id: "ask",
      label: "Ask your first question",
      done: sessions.length > 0,
      action: () => navigate("/study"),
    },
    {
      id: "map",
      label: "Generate a mind map",
      done: maps.length > 0,
      action: () => navigate("/mind-maps"),
    },
  ];
  const remaining = steps.filter((step) => !step.done);
  const nextStep = remaining[0];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description={
            nextStep
              ? "Pick up where you left off, or finish setting up your workspace."
              : "Everything is set up. Continue studying whenever you are ready."
          }
          actions={
            nextStep ? (
              <Button onClick={nextStep.action}>
                {nextStep.label}
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/study">
                  Continue studying
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            )
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Ready to study" value={ready.length} hint="documents indexed" />
          <StatTile
            label="Processing"
            value={processing.length}
            hint={processing.length ? "indexing now" : "nothing queued"}
          />
          <StatTile
            label="Needs attention"
            value={failed.length}
            hint={failed.length ? "failed to index" : "no failures"}
            tone={failed.length ? "warning" : "neutral"}
          />
          <StatTile label="Saved chats" value={sessions.length} hint="conversations" />
        </div>

        {failed.length > 0 && (
          <ErrorState
            title={`${failed.length} document${failed.length === 1 ? "" : "s"} failed to index`}
            message="Open the Library to see why and retry them."
            onRetry={() => navigate("/library")}
          />
        )}

        {remaining.length > 0 && (
          <Card>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Get set up</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {steps.length - remaining.length} of {steps.length} done
              </p>
            </div>
            <ul className="divide-y divide-border">
              {steps.map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={step.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunk"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        step.done
                          ? "border-success bg-success text-success-foreground"
                          : "border-border-strong"
                      )}
                    >
                      {step.done && <Check className="size-3" aria-hidden="true" />}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        step.done ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    {!step.done && (
                      <ArrowRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {activityError && <ErrorState message={activityError} />}

        <div className="grid gap-4 lg:grid-cols-2">
          <ListCard title="Recent chats" icon={MessageSquare} to="/study" linkLabel="Open">
            {activityLoading ? (
              <SkeletonList rows={3} />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No chats yet"
                description="Your conversations appear here once you ask a question."
                className="border-0 py-6"
              />
            ) : (
              <ul className="space-y-1">
                {sessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <Link
                      to={`/study?session=${encodeURIComponent(session.id)}`}
                      className="block rounded-md px-2.5 py-2 transition-colors hover:bg-surface-sunk"
                    >
                      <span className="block truncate text-sm text-foreground">
                        {session.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatWhen(session.updated_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ListCard>

          <ListCard title="Recent mind maps" icon={Network} to="/mind-maps" linkLabel="Open">
            {activityLoading ? (
              <SkeletonList rows={3} />
            ) : maps.length === 0 ? (
              <EmptyState
                icon={Network}
                title="No mind maps yet"
                description="Turn a document into a visual summary to revise from."
                className="border-0 py-6"
              />
            ) : (
              <ul className="space-y-1">
                {maps.slice(0, 5).map((map) => (
                  <li key={map.id}>
                    <Link
                      to={`/mind-maps?id=${encodeURIComponent(map.id)}`}
                      className="block rounded-md px-2.5 py-2 transition-colors hover:bg-surface-sunk"
                    >
                      <span className="block truncate text-sm text-foreground">
                        {map.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {map.source}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ListCard>
        </div>

        <ListCard title="Documents" icon={Library} to="/library" linkLabel="Manage">
          {loading && documents.length === 0 ? (
            <SkeletonList rows={2} />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing uploaded yet"
              description="Add a PDF or Word document to unlock studying and mind maps."
              action={
                <Button size="sm" asChild>
                  <Link to="/library">Upload a document</Link>
                </Button>
              }
              className="border-0 py-6"
            />
          ) : (
            <ul className="space-y-1">
              {documents.slice(0, 5).map((document) => (
                <li
                  key={document.id}
                  className="flex items-center gap-3 rounded-md px-2.5 py-2"
                >
                  <FileText
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {document.original_name}
                  </span>
                  <StatusIndicator status={document.status} />
                </li>
              ))}
            </ul>
          )}
        </ListCard>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link to="/library">
              <Library aria-hidden="true" />
              Upload material
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link to="/study">
              <BookOpen aria-hidden="true" />
              Ask a question
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link to="/tutorial">
              <GraduationCap aria-hidden="true" />
              How it works
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
