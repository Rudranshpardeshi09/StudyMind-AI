import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import {
  Clock,
  FileText,
  Layers,
  Library,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter } from "@/components/ui/overlays";
import {
  EmptyState,
  ErrorState,
  SkeletonList,
} from "@/components/ui/primitives";
import { useDocuments } from "@/features/library/DocumentsContext";
import { mindMapsApi } from "@/services/api";
import { toMessage } from "@/services/http";
import { cn } from "@/lib/utils";
import MindMapViewer from "./MindMapViewer";

const SCOPES = [
  { id: "full", label: "Whole document", icon: Layers, hint: "One map for everything" },
  { id: "chapter", label: "One chapter", icon: FileText, hint: "Focus on a section" },
  { id: "topic", label: "One topic", icon: Target, hint: "Deepest detail" },
];

function Section({ title, children }) {
  return (
    <section className="border-b border-border px-4 py-3.5">
      <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MindMapsPage() {
  const { ready, loading: documentsLoading } = useDocuments();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("id");

  const [source, setSource] = useState("uploaded_pdf");
  const [selectedIds, setSelectedIds] = useState([]);
  const [text, setText] = useState("");
  const [scope, setScope] = useState("full");
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");

  const [map, setMap] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await mindMapsApi.list());
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;
    if (!openId) {
      setMap(null);
      return undefined;
    }
    (async () => {
      try {
        const data = await mindMapsApi.get(openId);
        if (!cancelled) {
          setMap(data);
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) setError(toMessage(requestError, "That mind map could not be opened."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId]);

  useEffect(() => {
    if (scope === "full" || source !== "uploaded_pdf" || !selectedIds.length) return;
    let cancelled = false;
    setStructureLoading(true);
    setStructure(null);
    setChapter("");
    setTopic("");
    (async () => {
      try {
        const data = await mindMapsApi.structure(selectedIds[0]);
        if (!cancelled) setStructure(data);
      } catch {
        if (!cancelled) setError("Could not read that document's outline. Try Whole document.");
      } finally {
        if (!cancelled) setStructureLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, source, selectedIds]);

  const generate = async () => {
    setError(null);
    if (source === "uploaded_pdf" && !selectedIds.length) {
      setError("Select at least one document.");
      return;
    }
    if (source === "text" && !text.trim()) {
      setError("Paste some text to build a map from.");
      return;
    }
    if (scope === "chapter" && !chapter) {
      setError("Choose a chapter.");
      return;
    }
    if (scope === "topic" && !topic) {
      setError("Choose a topic.");
      return;
    }

    setGenerating(true);
    try {
      const result = await mindMapsApi.generate({
        source_type: source,
        document_ids: source === "uploaded_pdf" ? selectedIds : [],
        text_content: source === "text" ? text : null,
        mode: scope,
        selected_chapter: chapter || null,
        selected_topic: topic || null,
      });
      setMap(result);
      setSearchParams({ id: result.id }, { replace: true });
      loadHistory();
    } catch (requestError) {
      setError(toMessage(requestError, "Mind map generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  const topics =
    structure?.chapters?.find((item) => item.name === chapter)?.topics ?? [];

  const controls = (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <Section title="Source">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-sunk p-1">
          {[
            { id: "uploaded_pdf", label: "Documents", icon: FileText },
            { id: "text", label: "Paste text", icon: Type },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSource(tab.id);
                setError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-sm transition-colors",
                source === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="size-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>
      </Section>

      {source === "uploaded_pdf" ? (
        <Section title="Documents">
          {documentsLoading ? (
            <SkeletonList rows={2} />
          ) : ready.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Nothing indexed yet"
              description="Add a document before building a map."
              action={
                <Button size="sm" asChild>
                  <Link to="/library">Go to Library</Link>
                </Button>
              }
              className="py-6"
            />
          ) : (
            <ul className="space-y-1">
              {ready.map((document) => (
                <li key={document.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm transition-colors",
                      selectedIds.includes(document.id)
                        ? "border-primary/40 bg-primary-soft"
                        : "border-transparent hover:bg-surface-sunk"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(document.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(document.id)
                            ? prev.filter((value) => value !== document.id)
                            : [...prev, document.id]
                        )
                      }
                      className="size-3.5 shrink-0 rounded border-border-strong accent-[hsl(var(--primary))]"
                    />
                    <span className="min-w-0 flex-1 truncate">{document.original_name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : (
        <Section title="Text">
          <label htmlFor="mindmap-text" className="sr-only">
            Text to build a mind map from
          </label>
          <textarea
            id="mindmap-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder="Paste notes or an article…"
            className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none scrollbar-thin"
          />
          <p className="tabular mt-1 text-right text-xs text-muted-foreground">
            {text.length.toLocaleString()} characters
          </p>
        </Section>
      )}

      <Section title="Scope">
        <div className="space-y-1">
          {SCOPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setScope(option.id);
                setChapter("");
                setTopic("");
                setError(null);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                scope === option.id
                  ? "border-primary/40 bg-primary-soft"
                  : "border-transparent hover:bg-surface-sunk"
              )}
            >
              <option.icon
                className={cn(
                  "size-4 shrink-0",
                  scope === option.id ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {scope !== "full" && source === "uploaded_pdf" && (
        <Section title="Chapter">
          {structureLoading ? (
            <p className="text-xs text-muted-foreground">Reading the outline…</p>
          ) : (
            <select
              value={chapter}
              onChange={(event) => {
                setChapter(event.target.value);
                setTopic("");
              }}
              aria-label="Chapter"
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Choose a chapter…</option>
              {structure?.chapters?.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}

          {scope === "topic" && chapter && (
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              aria-label="Topic"
              className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Choose a topic…</option>
              {topics.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </Section>
      )}

      {error && (
        <div className="px-4 py-3">
          <ErrorState message={error} />
        </div>
      )}

      <div className="mt-auto border-t border-border p-4">
        <Button className="w-full" onClick={generate} loading={generating}>
          {!generating && <Sparkles aria-hidden="true" />}
          {generating ? "Generating…" : "Generate mind map"}
        </Button>
      </div>
    </div>
  );

  const galleryList = historyLoading ? (
    <SkeletonList rows={3} />
  ) : history.length === 0 ? (
    <p className="px-1 text-xs text-muted-foreground">
      Generated maps are saved here automatically.
    </p>
  ) : (
    <ul className="space-y-1">
      {history.map((item) => (
        <li key={item.id} className="group relative">
          <button
            type="button"
            onClick={() => setSearchParams({ id: item.id })}
            className={cn(
              "w-full rounded-md border px-2.5 py-2 pr-14 text-left transition-colors",
              item.id === openId
                ? "border-primary/40 bg-primary-soft"
                : "border-transparent hover:bg-surface-sunk"
            )}
          >
            <span className="block truncate text-sm text-foreground">{item.title}</span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              {item.source}
            </span>
          </button>
          <div className="absolute right-1 top-1.5 flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rename ${item.title}`}
              onClick={() => {
                setRenaming(item);
                setRenameValue(item.title);
                setRenameError(null);
              }}
            >
              <Pencil className="text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${item.title}`}
              onClick={() => setPendingDelete(item)}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );

  const gallery = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Saved maps
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">{galleryList}</div>
    </div>
  );

  return (
    <div className={cn("flex h-full", fullscreen && "fixed inset-0 z-50 bg-canvas")}>
      {!fullscreen && (
        <aside className="hidden w-[300px] shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          {controls}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-3">
        {!fullscreen && (
          <div className="mb-3 lg:hidden">
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground">
                Mind map setup
              </summary>
              <div className="border-t border-border">{controls}</div>
            </details>
          </div>
        )}

        {!fullscreen && (
          <div className="mb-3 xl:hidden">
            <details className="rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground">
                Saved maps{" "}
                <span className="tabular font-normal text-muted-foreground">({history.length})</span>
              </summary>
              <div className="max-h-72 overflow-y-auto border-t border-border p-3 scrollbar-thin">
                {galleryList}
              </div>
            </details>
          </div>
        )}

        <div className="min-h-0 flex-1">
          <ReactFlowProvider>
            <MindMapViewer
              data={map}
              loading={generating}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((value) => !value)}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {!fullscreen && (
        <aside className="hidden w-[260px] shrink-0 border-l border-border bg-surface xl:flex xl:flex-col">
          {gallery}
        </aside>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this mind map?"
        description={`"${pendingDelete?.title ?? ""}" will be removed permanently.`}
        confirmLabel="Delete map"
        onConfirm={async () => {
          const target = pendingDelete;
          await mindMapsApi.remove(target.id);
          setHistory((prev) => prev.filter((item) => item.id !== target.id));
          if (target.id === openId) setSearchParams({}, { replace: true });
          setPendingDelete(null);
        }}
      />

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open && !renameSaving) setRenaming(null);
        }}
      >
        <DialogContent title="Rename mind map">
          <label htmlFor="map-title" className="sr-only">
            Mind map title
          </label>
          <input
            id="map-title"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={120}
            className="mt-4 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          {renameError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {renameError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)} disabled={renameSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const target = renaming;
                setRenameSaving(true);
                setRenameError(null);
                try {
                  const updated = await mindMapsApi.rename(target.id, renameValue.trim());
                  setHistory((prev) =>
                    prev.map((item) =>
                      item.id === target.id ? { ...item, title: updated.title } : item
                    )
                  );
                  if (map?.id === target.id) setMap(updated);
                  setRenaming(null);
                } catch (requestError) {
                  setRenameError(toMessage(requestError, "Could not rename that mind map."));
                } finally {
                  setRenameSaving(false);
                }
              }}
              loading={renameSaving}
              disabled={!renameValue.trim() || renameSaving}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
