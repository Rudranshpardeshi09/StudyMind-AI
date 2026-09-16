import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, FileText, Library, Plus, Trash2 } from "lucide-react";

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
  // SQLite datetime('now') is UTC without a zone marker.
  const parsed = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  const minutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Section({ title, children, action }) {
  return (
    <section className="px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function StudyConfig({
  documents,
  documentsLoading,
  selectedIds,
  onToggleDocument,
  onSelectAll,
  marks,
  onMarksChange,
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
    <div className="flex h-full flex-col divide-y divide-border">
      {/* Documents ---------------------------------------------------- */}
      <Section
        title="Documents"
        action={
          documents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onSelectAll} className="h-6 px-1.5">
              {allSelected ? "Clear" : "All"}
            </Button>
          )
        }
      >
        {documentsLoading ? (
          <SkeletonList rows={2} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={Library}
            title="No documents ready"
            description="Index a document to start asking questions."
            action={
              <Button size="sm" asChild>
                <Link to="/library">Go to Library</Link>
              </Button>
            }
            className="py-6"
          />
        ) : (
          <ul className="space-y-1">
            {documents.map((document) => {
              const checked = selectedIds.includes(document.id);
              return (
                <li key={document.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary/40 bg-primary-soft"
                        : "border-transparent hover:bg-surface-sunk"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDocument(document.id)}
                      className="size-3.5 shrink-0 rounded border-border-strong accent-[hsl(var(--primary))]"
                    />
                    <FileText
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate" title={document.original_name}>
                      {document.original_name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {documents.length > 0 && selectedIds.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing selected — answers will search all {documents.length} documents.
          </p>
        )}
      </Section>

      {/* Answer length ------------------------------------------------ */}
      <Section title="Answer length">
        <div
          role="radiogroup"
          aria-label="Answer length"
          className="grid grid-cols-3 gap-1.5"
        >
          {MARKS_OPTIONS.map((option) => {
            const active = marks === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onMarksChange(option.value)}
                className={cn(
                  "rounded-md border px-2 py-2 text-center transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
              >
                <span className="block text-xs font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs opacity-75">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Syllabus ----------------------------------------------------- */}
      <Section
        title="Syllabus context"
        action={
          syllabus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSyllabusChange("")}
              className="h-6 px-1.5"
            >
              Clear
            </Button>
          )
        }
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
          className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none scrollbar-thin"
        />
      </Section>

      {/* Chats -------------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Section
          title="Recent chats"
          action={
            <Button variant="ghost" size="sm" onClick={onNewChat} className="h-6 px-1.5">
              <Plus aria-hidden="true" />
              New
            </Button>
          }
        >
          {sessionsLoading ? (
            <SkeletonList rows={2} />
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Saved conversations appear here after your first answer.
            </p>
          ) : (
            <ul className="space-y-1">
              {sessions.map((session) => {
                const active = session.id === activeSessionId;
                return (
                  <li key={session.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onOpenSession(session.id)}
                      className={cn(
                        "w-full rounded-md border px-2.5 py-2 pr-8 text-left transition-colors",
                        active
                          ? "border-primary/40 bg-primary-soft"
                          : "border-transparent hover:bg-surface-sunk"
                      )}
                    >
                      <span className="block truncate text-sm text-foreground">
                        {session.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatWhen(session.updated_at)}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPendingDelete(session)}
                      aria-label={`Delete chat: ${session.title}`}
                      className="absolute right-1 top-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this chat?"
        description={`"${pendingDelete?.title ?? ""}" and its messages will be removed. This cannot be undone.`}
        confirmLabel="Delete chat"
        onConfirm={() => {
          onDeleteSession(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export { StatusIndicator, Separator };
