import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  FileUp,
  Network,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import {
  ActivityBar,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  SkeletonList,
  StatusIndicator,
} from "@/components/ui/primitives";
import { MAX_UPLOAD_BYTES, validateFile } from "@/services/api";
import { toMessage } from "@/services/http";
import { cn } from "@/lib/utils";
import { useDocuments } from "./DocumentsContext";

const ACTIVE = new Set(["queued", "uploading", "parsing", "embedding"]);

function formatBytes(bytes) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocumentRow({ document, uploadPercent, onRetry, onDelete }) {
  const isActive = ACTIVE.has(document.status);

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={document.original_name}>
            {document.original_name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular">{formatBytes(document.byte_size)}</span>
            {document.status === "ready" && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular">
                  {document.pages} {document.pages === 1 ? "page" : "pages"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular">{document.chunk_count} passages</span>
              </>
            )}
          </p>

          {/* Determinate only while bytes are moving — a real measured value.
              Indexing gets an indeterminate bar because no percentage exists. */}
          {uploadPercent !== undefined && (
            <ProgressBar
              value={uploadPercent}
              label={`Uploading ${document.original_name}`}
              className="mt-2 max-w-xs"
            />
          )}
          {uploadPercent === undefined && isActive && (
            <ActivityBar
              label={`Processing ${document.original_name}`}
              className="mt-2 max-w-xs"
            />
          )}

          {document.status === "failed" && document.error && (
            <p className="mt-1.5 text-xs text-destructive">{document.error}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
        <StatusIndicator status={document.status} />
        {document.status === "failed" && (
          <Button variant="outline" size="sm" onClick={() => onRetry(document)}>
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(document)}
          aria-label={`Delete ${document.original_name}`}
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>
    </li>
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

  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);

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

  // Real drag-and-drop. The previous version styled a dashed border around a
  // plain file input and had no drag handlers at all.
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
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <PageHeader
          title="Library"
          description="Upload the material you want to study. Each document is indexed privately to your account."
          actions={
            documents.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                Remove all
              </Button>
            )
          }
        />

        {/* Drop zone -------------------------------------------------- */}
        <div
          onDragEnter={onDragEnter}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary-soft" : "border-border bg-surface"
          )}
        >
          <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-surface-sunk text-muted-foreground">
            <FileUp className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            {dragging ? "Drop to upload" : "Drag PDFs or Word documents here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or DOCX, up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB each
          </p>
          <Button className="mt-3" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" />
            Choose files
          </Button>
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

        {notice && (
          <ErrorState title="Some files need attention" message={notice} />
        )}
        {error && <ErrorState message={error} onRetry={() => { clearError(); refresh(); }} />}

        {/* Documents -------------------------------------------------- */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Documents{" "}
              <span className="tabular font-normal text-muted-foreground">
                ({documents.length})
              </span>
            </h2>
            {processing.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {processing.length} processing
              </span>
            )}
          </div>

          {loading && documents.length === 0 ? (
            <div className="p-4">
              <SkeletonList rows={3} />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Upload your first PDF or Word document to start asking questions about it."
              className="m-4 border-0"
            />
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  uploadPercent={uploads[document.stored_name] ?? uploads[document.original_name]}
                  onRetry={(doc) => retry(doc.id)}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          )}
        </Card>

        {ready.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/study">
                <BookOpen aria-hidden="true" />
                <span className="text-left">
                  <span className="block text-sm font-medium">Start studying</span>
                  <span className="block text-xs text-muted-foreground">
                    Ask questions with citations
                  </span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/mind-maps">
                <Network aria-hidden="true" />
                <span className="text-left">
                  <span className="block text-sm font-medium">Build a mind map</span>
                  <span className="block text-xs text-muted-foreground">
                    Turn a document into a diagram
                  </span>
                </span>
              </Link>
            </Button>
          </div>
        )}
      </div>

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
          await resetAll();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
