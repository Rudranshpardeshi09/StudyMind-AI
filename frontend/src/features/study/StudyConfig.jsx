import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileText, Library, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import {
  EmptyState,
  Separator,
  SkeletonList,
  StatusIndicator,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const MARKS_OPTIONS = [
  { value: 3, label: "Short", hint: "~100 words" },
  { value: 5, label: "Medium", hint: "~200 words" },
  { value: 12, label: "Long", hint: "~450 words" },
];

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

function Section({ number, title, children, action, className }) {
  return (
    <section className={cn("relative px-5 py-5", className)}>
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
            {String(number).padStart(2, "0")} /
          </span>
          <span className="font-display text-[1.15rem] font-semibold leading-none tracking-[-0.01em] text-foreground">
            {title}
          </span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniAction({ children, ...props }) {
  return (
    <button
      type="button"
      className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline lg:min-h-8"
      {...props}
    >
      {children}
    </button>
  );
}

export default function StudyConfig({
  documents,
  documentsLoading,
  selectedIds,
  onToggleDocument,
  onSelectAll,
  syllabus,
  onSyllabusChange,
  sessions,
  sessionsLoading,
  activeSessionId,
  onOpenSession,
  onDeleteSession,
  onNewChat,
}) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <p className="eyebrow">The study desk</p>
        <Button variant="secondary" onClick={onNewChat} className="mt-3 w-full justify-between">
          <span>New chat</span>
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <div className="mx-5 h-0.5 bg-border-strong" aria-hidden="true" />

      <Section
        number={1}
        title="Sources"
        action={
          documents.length > 0 && (
            <MiniAction onClick={onSelectAll}>{allSelected ? "Clear" : "All"}</MiniAction>
          )
        }
      >
        {documentsLoading ? (
          <SkeletonList rows={2} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={Library}
            art={false}
            title="No documents ready"
            description="Index a document to start asking questions."
            action={
              <Button size="sm" asChild>
                <Link to="/library">Go to Library</Link>
              </Button>
            }
            className="px-4 py-6"
          />
        ) : (
          <ul className="-mx-1.5 space-y-1">
            {documents.map((document) => {
              const checked = selectedIds.includes(document.id);
              return (
                <li key={document.id}>
                  <label
                    className={cn(
                      "group/doc flex min-h-11 cursor-pointer items-center gap-3 rounded-control border-2 px-2.5 py-2 text-sm transition-[background-color,border-color] duration-150",
                      checked
                        ? "border-border-strong bg-surface-raised"
                        : "border-transparent hover:bg-surface-sunk"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDocument(document.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-control transition-colors",
                        "peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                        checked ? "bg-primary text-primary-foreground" : "bg-surface"
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                    <FileText
                      className={cn(
                        "size-3.5 shrink-0",
                        checked ? "text-primary" : "text-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        checked ? "font-semibold text-foreground" : "text-foreground/85"
                      )}
                      title={document.original_name}
                    >
                      {document.original_name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {documents.length > 0 && selectedIds.length === 0 && (
          <p className="mt-3 border-l-2 border-citron pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            Nothing selected — answers will search all {documents.length} documents.
          </p>
        )}
      </Section>

      <div className="mx-5 h-px bg-border" aria-hidden="true" />

      <Section
        number={2}
        title="Syllabus"
        action={syllabus && <MiniAction onClick={() => onSyllabusChange("")}>Clear</MiniAction>}
      >
        <label htmlFor="syllabus-context" className="sr-only">
          Syllabus or topic list
        </label>
        <textarea
          id="syllabus-context"
          value={syllabus}
          onChange={(event) => onSyllabusChange(event.target.value)}
          rows={3}
          placeholder="Paste your syllabus or topic list to keep answers in scope…"
          className="w-full resize-y rounded-control border-2 border-border bg-surface-sunk px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground transition-colors focus:border-border-strong focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring scrollbar-thin"
        />
        <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
          {syllabus ? "Answers stay inside this scope" : "Optional"}
        </p>
      </Section>

      <div className="mx-5 h-px bg-border" aria-hidden="true" />

      <Section number={3} title="Recent chats" className="flex-1">
        {sessionsLoading ? (
          <SkeletonList rows={2} />
        ) : sessions.length === 0 ? (
          <p className="rounded-control border border-dashed border-border px-3 py-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            Saved conversations appear here after your first answer.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session, index) => {
              const active = session.id === activeSessionId;
              return (
                <li key={session.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-3 rounded-control border-2 px-3 py-2.5 pr-12 text-left",
                      "transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out motion-reduce:transform-none",
                      active
                        ? "border-border-strong bg-ink text-bone shadow-hs-sm dark:bg-bone dark:text-ink"
                        : "border-transparent hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-raised hover:shadow-hs-sm"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 font-mono text-[10.5px] font-semibold tabular",
                        active ? "text-citron dark:text-primary" : "text-primary"
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{session.title}</span>
                      <span
                        className={cn(
                          "mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.06em]",
                          active ? "opacity-70" : "text-muted-foreground"
                        )}
                      >
                        {formatWhen(session.updated_at)}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(session)}
                    aria-label={`Delete chat: ${session.title}`}
                    className={cn(
                      "absolute right-0.5 top-1/2 -translate-y-1/2 [&_svg]:size-4",
                      "lg:size-9 lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100",
                      active && "text-bone hover:text-foreground dark:text-ink"
                    )}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this chat?"
        description={`"${pendingDelete?.title ?? ""}" and its messages will be removed. This cannot be undone.`}
        confirmLabel="Delete chat"
        onConfirm={async () => {
          await onDeleteSession(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export { StatusIndicator, Separator };
