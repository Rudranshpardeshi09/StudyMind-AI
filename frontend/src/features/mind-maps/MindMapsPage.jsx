import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  Archive,
  Check,
  ChevronDown,
  FileText,
  Layers,
  Library,
  Pencil,
  Settings2,
  Target,
  Trash2,
  Type,
} from "lucide-react";

import { BigNumeral } from "@/components/art";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter } from "@/components/ui/overlays";
import { EmptyState, ErrorState, Eyebrow, SkeletonList } from "@/components/ui/primitives";
import { useDocuments } from "@/features/library/DocumentsContext";
import { springLayout, useReducedMotionSafe } from "@/lib/motion";
import { mindMapsApi } from "@/services/api";
import { toMessage } from "@/services/http";
import { cn } from "@/lib/utils";
import MindMapViewer from "./MindMapViewer";

const SCOPES = [
  {
    id: "full",
    label: "Whole",
    long: "Whole document",
    icon: Layers,
    hint: "One map for everything",
  },
  {
    id: "chapter",
    label: "Chapter",
    long: "One chapter",
    icon: FileText,
    hint: "Focus on a single section",
  },
  {
    id: "topic",
    label: "Topic",
    long: "One topic",
    icon: Target,
    hint: "Deepest detail on one idea",
  },
];

const SOURCES = [
  { id: "uploaded_pdf", label: "Documents", icon: FileText },
  { id: "text", label: "Paste text", icon: Type },
];

const FIELD =
  "w-full rounded-control border-2 border-border bg-surface-sunk px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-foreground/40 focus:border-border-strong focus:outline-none";

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function Segmented({ options, value, onChange, label, id }) {
  const m = useReducedMotionSafe();
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid gap-1 rounded-control border-2 border-border-strong bg-surface-sunk p-1",
        options.length === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[7px] px-2 text-sm font-semibold transition-colors",
              active ? "text-bone dark:text-ink" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={m.reduced ? { duration: 0 } : springLayout}
                className="absolute inset-0 rounded-[7px] border-2 border-black bg-ink shadow-hs-sm dark:bg-bone"
                aria-hidden="true"
              />
            )}
            <option.icon className="relative size-4 shrink-0" aria-hidden="true" />
            <span className="relative truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FormStep({ number, title, meta, children, className }) {
  return (
    <section className={cn("relative px-5 py-5 hairline-b", className)}>
      <div className="mb-3.5 flex items-baseline gap-3">
        <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
          {String(number).padStart(2, "0")} /
        </span>
        <h2 className="min-w-0 flex-1 font-display text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {meta && <span className="eyebrow shrink-0">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function IndexCard({ item, index, total, active, onOpen, onRename, onDelete }) {
  const date = formatDate(item.created_at);
  return (
    <li className={cn("group relative", index % 2 ? "ml-3" : "mr-3")}>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cn(
          "lift-card relative block w-full overflow-hidden rounded-card border-2 border-border-strong text-left",
          active ? "bg-surface shadow-hs" : "bg-surface-raised shadow-hs-sm"
        )}
      >
        {active && (
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
        )}
        <span className="flex h-9 items-center gap-2 pl-4 pr-[5.5rem] [@media(pointer:coarse)]:h-12">
          <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
            No. {String(total - index).padStart(2, "0")}
          </span>
          {active && (
            <span className="rounded-full border-[1.5px] border-black bg-citron px-1.5 font-mono text-[9px] font-semibold uppercase leading-4 tracking-[0.08em] text-citron-foreground">
              Open
            </span>
          )}
        </span>
        <span aria-hidden="true" className="mx-3 block h-px bg-primary/45" />
        <span className="block bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_21px,hsl(var(--info)/0.13)_21px,hsl(var(--info)/0.13)_22px)] px-4 pb-3 pt-2">
          <span className="line-clamp-2 font-display text-[1.05rem] font-semibold leading-[22px] tracking-[-0.01em] text-foreground">
            {item.title}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] uppercase leading-[22px] tracking-[0.06em] text-muted-foreground">
            <span className="min-w-0 truncate">{item.source}</span>
            {date && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0 tabular">{date}</span>
              </>
            )}
          </span>
        </span>
      </button>
      <div className="absolute right-1.5 top-1 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Rename ${item.title}`}
          onClick={onRename}
          className="size-8 [@media(pointer:coarse)]:size-11"
        >
          <Pencil className="text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${item.title}`}
          onClick={onDelete}
          className="size-8 [@media(pointer:coarse)]:size-11"
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
}

function Disclosure({ icon: Icon, title, meta, children }) {
  return (
    <details className="group/disc overflow-hidden rounded-card border-2 border-border-strong bg-surface shadow-hs-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="font-display text-base font-semibold text-foreground">{title}</span>
        {meta && <span className="eyebrow tabular">{meta}</span>}
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open/disc:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t-2 border-border-strong">{children}</div>
    </details>
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
  const [generatingSince, setGeneratingSince] = useState(null);
  const [generatingDetail, setGeneratingDetail] = useState("");
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

  const scopeOption = SCOPES.find((option) => option.id === scope) ?? SCOPES[0];

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

    const origin =
      source === "text"
        ? `Pasted text · ${text.length.toLocaleString()} characters`
        : `${selectedIds.length} ${selectedIds.length === 1 ? "document" : "documents"}`;
    const focus = topic || chapter;
    setGeneratingDetail(`${origin} · ${scopeOption.long}${focus ? ` · ${focus}` : ""}`);
    setGeneratingSince(Date.now());
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

  const topics = structure?.chapters?.find((item) => item.name === chapter)?.topics ?? [];

  const sourceMeta =
    source === "uploaded_pdf"
      ? selectedIds.length
        ? `${selectedIds.length} selected`
        : null
      : `${text.length.toLocaleString()} chars`;

  const renderControls = (slot) => {
    const suffix = slot === "rail" ? "" : `-${slot}`;
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {slot === "rail" && (
            <header className="relative overflow-hidden px-5 pb-5 pt-6 hairline-b">
              <BigNumeral value={4} size="7.5rem" className="absolute -right-3 -top-6" />
              <Eyebrow number={4} className="relative">
                Map maker
              </Eyebrow>
              <p className="display relative mt-3 text-[2rem] text-foreground">
                Sketch the <span className="display-italic text-primary">big picture</span>
              </p>
              <p className="relative mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
                Pick your sources, set the scope, and it branches out into a map you can explore.
              </p>
            </header>
          )}

          <FormStep number={1} title="Source documents" meta={sourceMeta}>
            <Segmented
              id={`${slot}-source`}
              label="Source"
              options={SOURCES}
              value={source}
              onChange={(next) => {
                setSource(next);
                setError(null);
              }}
            />

            <div className="mt-3">
              {source === "uploaded_pdf" ? (
                documentsLoading ? (
                  <SkeletonList rows={2} />
                ) : ready.length === 0 ? (
                  <EmptyState
                    icon={Library}
                    art={false}
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
                  <ul className="space-y-1.5">
                    {ready.map((document) => {
                      const checked = selectedIds.includes(document.id);
                      return (
                        <li key={document.id}>
                          <label
                            className={cn(
                              "flex min-h-11 cursor-pointer items-center gap-3 rounded-control border-2 px-3 py-2 text-sm transition-[background-color,border-color,box-shadow]",
                              checked
                                ? "border-border-strong bg-surface-raised shadow-hs-sm"
                                : "border-transparent hover:border-border hover:bg-surface-sunk"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedIds((prev) =>
                                  prev.includes(document.id)
                                    ? prev.filter((value) => value !== document.id)
                                    : [...prev, document.id]
                                )
                              }
                              className="peer sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-[5px] border-2 border-control transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                                checked ? "bg-primary text-primary-foreground" : "bg-surface"
                              )}
                            >
                              {checked && <Check className="size-3.5" strokeWidth={3} />}
                            </span>
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                checked ? "font-semibold text-foreground" : "text-foreground/85"
                              )}
                            >
                              {document.original_name}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <>
                  <label htmlFor={`mindmap-text${suffix}`} className="sr-only">
                    Text to build a mind map from
                  </label>
                  <textarea
                    id={`mindmap-text${suffix}`}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={7}
                    placeholder="Paste notes or an article…"
                    className={cn(FIELD, "resize-y py-2.5 leading-relaxed scrollbar-thin")}
                  />
                  <p className="tabular mt-1.5 text-right font-mono text-[11px] text-muted-foreground">
                    {text.length.toLocaleString()} characters
                  </p>
                </>
              )}
            </div>
          </FormStep>

          <FormStep number={2} title="Scope">
            <Segmented
              id={`${slot}-scope`}
              label="Scope"
              options={SCOPES}
              value={scope}
              onChange={(next) => {
                setScope(next);
                setChapter("");
                setTopic("");
                setError(null);
              }}
            />
            <p className="mt-2.5 flex items-baseline gap-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-primary" aria-hidden="true">
                →
              </span>
              <span>
                <span className="font-semibold uppercase tracking-[0.06em] text-foreground">
                  {scopeOption.long}
                </span>{" "}
                — {scopeOption.hint.toLowerCase()}
              </span>
            </p>

            {scope !== "full" && source === "uploaded_pdf" && (
              <div className="mt-4 space-y-3">
                {structureLoading ? (
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Reading the outline…
                  </p>
                ) : (
                  <div>
                    <label htmlFor={`mindmap-chapter${suffix}`} className="eyebrow mb-1.5 block">
                      Chapter
                    </label>
                    <select
                      id={`mindmap-chapter${suffix}`}
                      value={chapter}
                      onChange={(event) => {
                        setChapter(event.target.value);
                        setTopic("");
                      }}
                      aria-label="Chapter"
                      className={cn(FIELD, "h-11")}
                    >
                      <option value="">Choose a chapter…</option>
                      {structure?.chapters?.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === "topic" && chapter && (
                  <div>
                    <label htmlFor={`mindmap-topic${suffix}`} className="eyebrow mb-1.5 block">
                      Topic
                    </label>
                    <select
                      id={`mindmap-topic${suffix}`}
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      aria-label="Topic"
                      className={cn(FIELD, "h-11")}
                    >
                      <option value="">Choose a topic…</option>
                      {topics.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </FormStep>

          {error && (
            <div className="px-5 py-4">
              <ErrorState message={error} />
            </div>
          )}
        </div>

        <FormStep
          number={3}
          title="Generate"
          className="border-b-0 border-t-2 border-border-strong bg-surface-raised"
        >
          <Button
            size="lg"
            className="w-full"
            onClick={generate}
            loading={generating}
            arrow={!generating}
          >
            {generating ? "Generating…" : "Generate mind map"}
          </Button>
          <p className="mt-2.5 text-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
            Saved to your archive automatically
          </p>
        </FormStep>
      </div>
    );
  };

  const openMap = (id) => setSearchParams({ id });

  const galleryList = historyLoading ? (
    <SkeletonList rows={3} />
  ) : history.length === 0 ? (
    <div className="rounded-card border border-dashed border-border px-4 py-6 text-center">
      <p className="font-display text-base font-semibold text-foreground">The archive is empty</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Generated maps are saved here automatically.
      </p>
    </div>
  ) : (
    <ul className="space-y-3.5 pb-2 pr-1.5">
      {history.map((item, index) => (
        <IndexCard
          key={item.id}
          item={item}
          index={index}
          total={history.length}
          active={item.id === openId}
          onOpen={() => openMap(item.id)}
          onRename={() => {
            setRenaming(item);
            setRenameValue(item.title);
            setRenameError(null);
          }}
          onDelete={() => setPendingDelete(item)}
        />
      ))}
    </ul>
  );

  const gallery = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative px-5 pb-4 pt-6 hairline-b">
        <Eyebrow number={5}>Archive</Eyebrow>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold leading-none tracking-[-0.015em] text-foreground">
            Saved maps
          </h2>
          <span className="font-mono text-[11px] font-semibold tabular text-muted-foreground">
            {String(history.length).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">{galleryList}</div>
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0", fullscreen && "fixed inset-0 z-50 bg-canvas")}>
      {!fullscreen && (
        <aside className="hidden w-[300px] shrink-0 bg-surface hairline-r lg:flex lg:flex-col 2xl:w-[320px]">
          {renderControls("rail")}
        </aside>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4",
          fullscreen
            ? "overflow-hidden"
            : "overflow-y-auto overflow-x-hidden lg:overflow-hidden lg:p-5"
        )}
      >
        {!fullscreen && (
          <div className="lg:hidden">
            <Disclosure icon={Settings2} title="Mind map setup">
              {renderControls("sheet")}
            </Disclosure>
          </div>
        )}

        {!fullscreen && (
          <div className="min-[1800px]:hidden">
            <Disclosure icon={Archive} title="Saved maps" meta={`(${history.length})`}>
              <div className="max-h-80 overflow-y-auto p-3 lg:max-h-60 scrollbar-thin">{galleryList}</div>
            </Disclosure>
          </div>
        )}

        <div className={cn("min-h-0 flex-1", !fullscreen && "min-h-[540px] lg:min-h-0")}>
          <ReactFlowProvider>
            <MindMapViewer
              data={map}
              loading={generating}
              loadingSince={generatingSince}
              loadingDetail={generatingDetail}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((value) => !value)}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {!fullscreen && (
        <aside className="hidden w-[280px] shrink-0 bg-surface hairline-l min-[1800px]:flex min-[1800px]:flex-col">
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
          <label htmlFor="map-title" className="eyebrow mt-4 block">
            Mind map title
          </label>
          <input
            id="map-title"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={120}
            className={cn(FIELD, "mt-1.5 h-11")}
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
