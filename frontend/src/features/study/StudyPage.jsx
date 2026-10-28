import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/overlays";
import { Badge, ErrorState } from "@/components/ui/primitives";
import { useDocuments } from "@/features/library/DocumentsContext";
import { chatApi } from "@/services/api";
import { toMessage } from "@/services/http";
import Composer from "./Composer";
import StudyConfig, { MARKS_OPTIONS } from "./StudyConfig";
import Transcript from "./Transcript";
import { useAnswerStream } from "./useAnswerStream";

let localId = 0;
const nextId = () => `m${++localId}`;

export default function StudyPage() {
  const { ready, loading: documentsLoading } = useDocuments();
  const [searchParams, setSearchParams] = useSearchParams();
  const stream = useAnswerStream();

  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [marks, setMarks] = useState(3);
  const [syllabus, setSyllabus] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [pendingStartedAt, setPendingStartedAt] = useState(null);
  const [draft, setDraft] = useState("");
  const [loadError, setLoadError] = useState(null);

  const sessionId = searchParams.get("session");
  const documentParam = searchParams.get("document");

  const selectedIds = useMemo(() => {
    if (!documentParam) return [];
    const wanted = documentParam.split(",").filter(Boolean);
    return ready.filter((doc) => wanted.includes(doc.id)).map((doc) => doc.id);
  }, [documentParam, ready]);

  const lastQuestion = useRef("");
  const mountedRef = useRef(true);
  const runRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const patchParams = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, value);
            else next.delete(key);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      setSessions(await chatApi.list());
    } catch {
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setMessages([]);
      return undefined;
    }
    (async () => {
      try {
        const session = await chatApi.get(sessionId);
        if (cancelled) return;
        setMessages(
          (session.messages ?? []).map((message) => ({
            id: `s${message.id}`,
            role: message.role,
            content: message.content,
            sources: message.sources ?? [],
            createdAt: message.created_at ?? null,
          }))
        );
        setMarks(session.marks ?? 3);
        setSyllabus(session.syllabus_context ?? "");
        setLoadError(null);
      } catch (error) {
        if (!cancelled) setLoadError(toMessage(error, "That chat could not be opened."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const canAsk = ready.length > 0;

  const send = useCallback(
    async (question) => {
      lastQuestion.current = question;
      setDraft("");
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: question, createdAt: Date.now() },
      ]);
      setPendingStartedAt(Date.now());
      const run = ++runRef.current;

      const outcome = await stream.ask({
        question,
        marks,
        syllabus_context: syllabus || null,
        session_id: sessionId || null,
        document_ids: selectedIds,
        chat_history: messages
          .filter((message) => !message.error)
          .slice(-10)
          .map(({ role, content }) => ({ role, content })),
      });

      if (!mountedRef.current || run !== runRef.current) return;
      setPendingStartedAt(null);

      if (outcome.cancelled) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: "Generation stopped.",
            error: true,
          },
        ]);
        setDraft(question);
        return;
      }

      if (!outcome.ok) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: outcome.error, error: true },
        ]);
        setDraft(question);
        return;
      }

      const { answer, sources, session_id: newSessionId } = outcome.result;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: answer,
          sources: sources ?? [],
          marks,
          createdAt: Date.now(),
          fresh: true,
        },
      ]);
      if (newSessionId && newSessionId !== sessionId) patchParams({ session: newSessionId });
      loadSessions();
    },
    [
      marks,
      syllabus,
      sessionId,
      selectedIds,
      messages,
      stream,
      patchParams,
      loadSessions,
    ]
  );

  const retry = useCallback(() => {
    if (!lastQuestion.current) return;
    setMessages((prev) => {
      const trimmed = [...prev];
      if (trimmed.at(-1)?.error) trimmed.pop();
      if (trimmed.at(-1)?.role === "user") trimmed.pop();
      return trimmed;
    });
    send(lastQuestion.current);
  }, [send]);

  const config = (
    <StudyConfig
      documents={ready}
      documentsLoading={documentsLoading}
      selectedIds={selectedIds}
      onToggleDocument={(id) => {
        const next = selectedIds.includes(id)
          ? selectedIds.filter((value) => value !== id)
          : [...selectedIds, id];
        patchParams({ document: next.join(",") });
      }}
      onSelectAll={() =>
        patchParams({
          document:
            selectedIds.length === ready.length ? "" : ready.map((doc) => doc.id).join(","),
        })
      }
      syllabus={syllabus}
      onSyllabusChange={setSyllabus}
      sessions={sessions}
      sessionsLoading={sessionsLoading}
      activeSessionId={sessionId}
      onOpenSession={(id) => {
        patchParams({ session: id });
        setConfigOpen(false);
      }}
      onDeleteSession={async (id) => {
        await chatApi.remove(id);
        setSessions((prev) => prev.filter((session) => session.id !== id));
        if (id === sessionId) patchParams({ session: "" });
      }}
      onNewChat={() => {
        runRef.current += 1;
        stream.reset();
        setPendingStartedAt(null);
        patchParams({ session: "" });
        setMessages([]);
        setConfigOpen(false);
      }}
    />
  );

  const activeMarks = MARKS_OPTIONS.find((option) => option.value === marks);
  const busy = stream.status === "streaming";

  return (
    <div className="flex h-full">
      <aside
        aria-label="Study setup"
        className="hidden w-[300px] shrink-0 overflow-y-auto border-r-2 border-border-strong bg-surface scrollbar-thin xl:block"
      >
        {config}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b-2 border-border-strong bg-surface px-3 py-2 sm:px-6 xl:hidden">
          <Button variant="outline" onClick={() => setConfigOpen(true)} className="shrink-0 px-3.5">
            <SlidersHorizontal aria-hidden="true" />
            Setup
          </Button>
          <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
            <Badge tone="ink">{activeMarks ? `${activeMarks.value} marks` : "3 marks"}</Badge>
            <Badge tone="neutral">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : `${ready.length} ${ready.length === 1 ? "doc" : "docs"}`}
            </Badge>
            {syllabus && <Badge tone="citron">Syllabus</Badge>}
          </div>
        </div>

        {loadError && (
          <div className="mx-auto w-full max-w-[1040px] px-4 pt-4 sm:px-6 lg:px-10">
            <ErrorState message={loadError} onRetry={() => patchParams({ session: "" })} />
          </div>
        )}

        <Transcript
          messages={messages}
          stream={stream}
          pendingStartedAt={pendingStartedAt}
          canAsk={canAsk}
          documentCount={selectedIds.length || ready.length}
          onSuggestion={send}
          onRetry={retry}
          onCancel={stream.cancel}
        />

        <Composer
          onSend={send}
          onCancel={stream.cancel}
          busy={busy}
          disabled={!canAsk}
          disabledReason="Add a document in the Library first"
          restoreValue={draft}
          marks={marks}
          marksOptions={MARKS_OPTIONS}
          onMarksChange={setMarks}
        />
      </div>

      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side="bottom" title="Study setup" className="xl:hidden">
          {config}
        </SheetContent>
      </Sheet>
    </div>
  );
}
