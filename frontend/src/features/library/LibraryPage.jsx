import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  Network,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { CropMarks, GridPaper, PaperStack3D, Squiggle, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import {
  EmptyState,
  ErrorState,
  Eyebrow,
  Marginalia,
  PageHeader,
  SkeletonList,
  StatusIndicator,
} from "@/components/ui/primitives";
import { MAX_UPLOAD_BYTES, validateFile } from "@/services/api";
import { toMessage } from "@/services/http";
import { pageEnter, riseIn, scaleIn, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useDocuments } from "./DocumentsContext";

const ACTIVE = new Set(["queued", "uploading", "parsing", "embedding"]);

const PROCESS_COPY = {
  queued: { word: "Queued", detail: "waiting for a free worker" },
  uploading: { word: "Uploading", detail: "sending the file" },
  parsing: { word: "Reading", detail: "extracting text from each page" },
  embedding: { word: "Embedding", detail: "turning passages into vectors" },
};

const STRIPES =
  "repeating-linear-gradient(-45deg, hsl(var(--primary)) 0 8px, hsl(var(--primary) / 0.72) 8px 16px)";

function formatBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function StripedProgress({ value, label }) {
  const m = useReducedMotionSafe();
  const clamped = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-4 w-full overflow-hidden rounded-[6px] border-2 border-border-strong bg-surface-sunk shadow-hs-sm"
    >
      <motion.div
        className="h-full border-r-2 border-border-strong transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%`, backgroundImage: STRIPES, backgroundSize: "22.63px 22.63px" }}
        animate={m.reduced ? undefined : { backgroundPositionX: ["0px", "22.63px"] }}
        transition={m.reduced ? undefined : { duration: 0.6, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

function PendingUploadRow({ name, percent }) {
  const m = useReducedMotionSafe();
  return (
    <motion.li
      layout={!m.reduced}
      variants={m.variants(scaleIn)}
      initial={m.initial}
      animate="show"
      exit="exit"
      className="relative rounded-card border-2 border-border-strong bg-surface-raised p-4 shadow-hs sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control border-2 border-black bg-citron text-citron-foreground">
          <Upload className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground" title={name}>
            {name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            Uploading…
          </p>
        </div>
        <span className="display tabular text-3xl text-foreground">
          {percent}
          <span className="text-lg text-muted-foreground">%</span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <StripedProgress value={percent} label={`Uploading ${name}`} />
        <StatusIndicator status="uploading" className="shrink-0 max-sm:hidden" />
      </div>
    </motion.li>
  );
}

function ProcessingNote({ status, name }) {
  const copy = PROCESS_COPY[status] ?? PROCESS_COPY.queued;
  return (
    <div role="status" aria-label={`Processing ${name}`} className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="relative inline-block pb-2">
        <span className="font-display text-lg font-semibold italic leading-none text-primary">
          {copy.word}
        </span>
        <Squiggle
          color="cherry"
          width="100%"
          height={8}
          strokeWidth={2}
          className="absolute inset-x-0 bottom-0"
        />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        {copy.detail}
      </span>
    </div>
  );
}

function DocumentRow({ document, index, onRetry, onDelete }) {
  const m = useReducedMotionSafe();
  const isActive = ACTIVE.has(document.status);
  const failed = document.status === "failed";

  return (
    <motion.li
      layout={!m.reduced}
      variants={m.variants(riseIn)}
      initial={m.initial}
      animate="show"
      exit={m.reduced ? undefined : { opacity: 0, x: -24, transition: { duration: 0.18 } }}
      className={cn(
        "group relative flex overflow-hidden rounded-card border bg-surface-raised transition-[transform,box-shadow,border-color] duration-150 ease-out",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-hs motion-reduce:transform-none",
        failed ? "border-2 border-destructive" : "border-border"
      )}
    >
      <div className="hidden w-14 shrink-0 flex-col items-center border-r border-border py-4 sm:flex">
        <span className="font-mono text-[11px] font-semibold text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
        <FileText className="mt-2 size-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 p-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[15px] font-semibold text-foreground"
              title={document.original_name}
            >
              {document.original_name}
            </p>
            <div className="mt-1.5 h-px w-full bg-primary/40" aria-hidden="true" />
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {document.status === "ready" && (
                <>
                  <span className="tabular">
                    {document.pages} {document.pages === 1 ? "page" : "pages"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular">{document.chunk_count} passages</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className="tabular">{formatBytes(document.byte_size)}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusIndicator status={document.status} />
            <span className="flex-1 sm:hidden" />
            {failed && (
              <Button
                variant="secondary"
                size="sm"
                className="max-sm:h-11"
                onClick={() => onRetry(document)}
              >
                <RefreshCw aria-hidden="true" />
                Retry
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              className="hover:bg-destructive hover:text-destructive-foreground max-sm:size-11"
              onClick={() => onDelete(document)}
              aria-label={`Delete ${document.original_name}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        {isActive && <ProcessingNote status={document.status} name={document.original_name} />}

        {failed && document.error && (
          <p className="mt-3 flex items-start gap-2 rounded-control border-l-[3px] border-destructive bg-destructive-soft px-3 py-2 font-mono text-xs leading-relaxed text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {document.error}
          </p>
        )}
      </div>
    </motion.li>
  );
}

function Notice({ message }) {
  return (
    <div
      role="alert"
      className="relative mt-3 rounded-card border-2 border-border-strong bg-surface-raised px-5 pb-4 pt-6 shadow-hs"
    >
      <Sticker tone="citron" rotate={-3} className="absolute -top-3 left-4">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Some files need attention
      </Sticker>
      <p className="text-sm text-foreground/85">{message}</p>
    </div>
  );
}

export default function LibraryPage() {
  const {
    documents,
    ready,
    processing,
    loading,
    error,
    uploads,
    upload,
    retry,
    remove,
    resetAll,
    refresh,
    clearError,
  } = useDocuments();

  const m = useReducedMotionSafe();
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const pendingUploads = Object.entries(uploads);
  const busy = dragging || pendingUploads.length > 0;

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList ?? []);
      if (!files.length) return;
      setNotice(null);

      const problems = [];
      for (const file of files) {
        const invalid = validateFile(file);
        if (invalid) {
          problems.push(`${file.name}: ${invalid}`);
          continue;
        }
        const result = await upload(file);
        if (!result.ok) problems.push(`${file.name}: ${result.message}`);
        else if (result.duplicate) problems.push(result.message);
      }
      if (problems.length) setNotice(problems.join(" "));
    },
    [upload]
  );

  const onDragEnter = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) setDragging(false);
  };
  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(event.dataTransfer?.files);
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
      <motion.div
        variants={m.variants(pageEnter)}
        initial={m.initial}
        animate="show"
        className="mx-auto max-w-shell space-y-10 px-4 py-8 sm:px-6 lg:px-10 lg:py-12"
      >
        <motion.div variants={m.variants(riseIn)}>
          <PageHeader
            as="h2"
            number={2}
            eyebrow="Library"
            title="Your reading"
            emphasis="shelf."
            description="Upload the material you want to study. Each document is indexed privately to your account."
            marginalia={
              <Marginalia label="Shelf count">
                <span className="tabular">
                  {documents.length} {documents.length === 1 ? "document" : "documents"} · {ready.length} ready ·{" "}
                  {processing.length} processing
                </span>
              </Marginalia>
            }
          />
        </motion.div>

        <motion.div variants={m.variants(riseIn)}>
          <div
            data-dropzone=""
            onDragEnter={onDragEnter}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "relative isolate overflow-hidden rounded-hero border-2 border-dashed px-5 py-8 transition-[background-color,border-color,box-shadow] duration-200 sm:px-10 sm:py-10",
              dragging
                ? "border-primary bg-primary-soft shadow-hs-lg"
                : "border-foreground/30 bg-surface"
            )}
          >
            <GridPaper cell={28} className="-z-10 opacity-80" />
            <CropMarks offset={-10} className="m-4 hidden sm:block" />
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
              <div className="relative mx-auto flex items-center justify-center sm:mx-0">
                <PaperStack3D active={busy} size={150} />
                <AnimatePresence>
                  {dragging && (
                    <motion.span
                      key="drop"
                      initial={m.reduced ? false : { opacity: 0, scale: 0.6, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -right-4 top-2"
                    >
                      <Sticker tone="cherry" rotate={8}>
                        Let go!
                      </Sticker>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <Eyebrow className="mb-2 justify-center sm:justify-start">Paper tray</Eyebrow>
                <p className="display text-3xl text-foreground sm:text-[2.6rem]">
                  {dragging ? (
                    <>
                      Drop to <em className="display-italic text-primary">upload</em>
                    </>
                  ) : (
                    <>
                      Drag PDFs or Word documents <em className="display-italic text-primary">here</em>
                    </>
                  )}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  PDF or DOCX, up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB each
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <Button onClick={() => inputRef.current?.click()}>
                    <Upload aria-hidden="true" />
                    Choose files
                  </Button>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    or drop them anywhere in the tray
                  </span>
                </div>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="sr-only"
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {notice && <Notice message={notice} />}
          {error && (
            <ErrorState
              className="mt-4"
              message={error}
              onRetry={() => {
                clearError();
                refresh();
              }}
            />
          )}
        </motion.div>

        <motion.section variants={m.variants(riseIn)} aria-labelledby="library-documents">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-border-strong pb-3">
            <div>
              <Eyebrow number={3} className="mb-1.5">
                The shelf
              </Eyebrow>
              <h3
                id="library-documents"
                className="font-display text-2xl font-semibold leading-tight tracking-[-0.015em] text-foreground"
              >
                Documents{" "}
                <span className="tabular font-mono text-base font-normal text-muted-foreground">
                  ({documents.length})
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {processing.length > 0 && (
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-info opacity-60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-info" />
                  </span>
                  {processing.length} processing
                </span>
              )}
              {documents.length > 0 && (
                <Button variant="outline" size="sm" className="max-sm:h-11" onClick={() => setResetOpen(true)}>
                  <Trash2 aria-hidden="true" />
                  Remove all
                </Button>
              )}
            </div>
          </div>

          {loading && documents.length === 0 && pendingUploads.length === 0 ? (
            <SkeletonList rows={3} />
          ) : documents.length === 0 && pendingUploads.length === 0 ? (
            <EmptyState
              icon={FileText}
              art="cube"
              artSize={104}
              title="No documents yet"
              description="Upload your first PDF or Word document to start asking questions about it."
              action={
                <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  Upload a document
                </Button>
              }
              className="bg-surface/60 py-14"
            />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {pendingUploads.map(([name, percent]) => (
                  <PendingUploadRow key={`upload-${name}`} name={name} percent={percent} />
                ))}
                {documents.map((document, index) => (
                  <DocumentRow
                    key={document.id}
                    index={index}
                    document={document}
                    onRetry={async (doc) => {
                      try {
                        await retry(doc.id);
                      } catch (retryError) {
                        setNotice(toMessage(retryError, "Could not retry that document."));
                      }
                    }}
                    onDelete={setPendingDelete}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.section>

        {ready.length > 0 && (
          <motion.nav
            variants={m.variants(riseIn)}
            aria-label="Next steps"
            className="grid gap-4 sm:grid-cols-2"
          >
            {[
              {
                to: "/study",
                icon: BookOpen,
                title: "Start studying",
                note: "Ask questions with citations",
                tone: "bg-primary text-primary-foreground",
              },
              {
                to: "/mind-maps",
                icon: Network,
                title: "Build a mind map",
                note: "Turn a document into a diagram",
                tone: "bg-citron text-citron-foreground",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex min-h-[88px] items-center gap-4 rounded-card border-2 border-border-strong bg-surface p-4 shadow-hs transition-[transform,box-shadow] duration-150 ease-out hover:-translate-x-px hover:-translate-y-px hover:shadow-hs-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-hs-press motion-reduce:transform-none sm:p-5"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-control border-2 border-black",
                    item.tone
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">{item.note}</span>
                </span>
                <ArrowRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </motion.nav>
        )}
      </motion.div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this document?"
        description={`"${pendingDelete?.original_name ?? ""}" and its index entries will be removed. Your other documents stay indexed. This cannot be undone.`}
        confirmLabel="Delete document"
        onConfirm={async () => {
          try {
            await remove(pendingDelete.id);
          } catch (deleteError) {
            setNotice(toMessage(deleteError, "Could not delete that document."));
          }
          setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Remove all documents?"
        description={`All ${documents.length} documents and your entire search index will be deleted. Saved chats are kept, but their citations will no longer resolve. This cannot be undone.`}
        confirmLabel="Remove everything"
        onConfirm={async () => {
          try {
            await resetAll();
          } catch (resetError) {
            setNotice(toMessage(resetError, "Could not remove your documents."));
          }
          setResetOpen(false);
        }}
      />
    </div>
  );
}
