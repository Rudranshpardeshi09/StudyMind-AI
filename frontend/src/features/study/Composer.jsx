import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const MAX_CHARS = 1000;
const COUNTER_FROM = 800;

export default function Composer({
  onSend,
  onCancel,
  busy = false,
  disabled = false,
  disabledReason,
  restoreValue = "",
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (restoreValue) setValue(restoreValue);
  }, [restoreValue]);

  const resize = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 168)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  const trimmed = value.trim();
  const tooLong = trimmed.length > MAX_CHARS;
  const canSend = Boolean(trimmed) && !tooLong && !busy && !disabled;

  const submit = useCallback(() => {
    if (!canSend) return;
    onSend(trimmed);
    setValue("");
  }, [canSend, onSend, trimmed]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface p-3">
      <div
        className={cn(
          "rounded-lg border bg-background transition-colors",
          tooLong ? "border-destructive" : "border-border-strong focus-within:border-primary"
        )}
      >
        <label htmlFor="study-composer" className="sr-only">
          Ask a question about your study material
        </label>
        <textarea
          id="study-composer"
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? disabledReason || "Add a document to start asking questions"
              : "Ask a question about your material…"
          }
          className={
            "w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground " +
            "placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed " +
            "disabled:opacity-60 scrollbar-thin"
          }
          aria-describedby="composer-help"
          aria-invalid={tooLong || undefined}
        />

        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <p id="composer-help" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Kbd>Enter</Kbd> to send
            <span className="hidden sm:inline">
              · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line
            </span>
          </p>

          <div className="flex items-center gap-2">
            {trimmed.length >= COUNTER_FROM && (
              <span
                className={cn(
                  "tabular text-xs",
                  tooLong ? "font-medium text-destructive" : "text-muted-foreground"
                )}
              >
                {trimmed.length}/{MAX_CHARS}
              </span>
            )}
            {busy ? (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <Square aria-hidden="true" />
                Stop
              </Button>
            ) : (
              <Button size="icon-sm" onClick={submit} disabled={!canSend} aria-label="Send question">
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
      </div>

      {tooLong && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          That question is {trimmed.length - MAX_CHARS} characters too long. Shorten it and
          send again.
        </p>
      )}
    </div>
  );
}
