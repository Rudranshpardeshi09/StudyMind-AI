import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const MAX_CHARS = 1000;
const COUNTER_FROM = 800;

function MarksControl({ options, value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow hidden text-foreground sm:inline" id="composer-marks-label">
        Marks
      </span>
      <div
        role="radiogroup"
        aria-label="Answer length in marks"
        className="flex rounded-control border-2 border-border-strong bg-surface-sunk p-0.5 shadow-hs-sm"
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              title={`${option.label} · ${option.hint}`}
              aria-label={`${option.value} marks, ${option.label.toLowerCase()} answer, ${option.hint}`}
              className={cn(
                "relative flex h-10 min-w-11 items-center justify-center rounded-[7px] px-2.5 font-mono text-[13px] font-semibold tabular",
                "transition-[background-color,color,box-shadow] [transition-duration:120ms] ease-out disabled:opacity-55",
                active
                  ? "bg-ink text-bone shadow-[inset_0_-2px_0_0_hsl(var(--citron))] dark:bg-bone dark:text-ink dark:shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {option.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Composer({
  onSend,
  onCancel,
  busy = false,
  disabled = false,
  disabledReason,
  restoreValue = "",
  marks,
  marksOptions,
  onMarksChange,
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
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  const trimmed = value.trim();
  const tooLong = trimmed.length > MAX_CHARS;
  const canSend = Boolean(trimmed) && !tooLong && !busy && !disabled;
  const showMarks = Boolean(marksOptions?.length && onMarksChange);
  const activeOption = marksOptions?.find((option) => option.value === marks);

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
    <div className="relative shrink-0 px-3 pb-3 pt-1 sm:px-6 sm:pb-5 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent"
      />
      <div className="relative mx-auto w-full max-w-[1040px]">
        <div
          className={cn(
            "rounded-card border-2 bg-surface-raised shadow-hs-lg transition-[border-color,box-shadow,transform] duration-150 ease-out",
            tooLong
              ? "border-destructive"
              : "border-border-strong focus-within:-translate-y-px focus-within:shadow-hs-xl motion-reduce:transform-none",
            "has-[textarea:focus-visible]:outline has-[textarea:focus-visible]:outline-[3px] has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring",
            disabled && "bg-surface-sunk shadow-hs"
          )}
        >
          <label htmlFor="study-composer" className="sr-only">
            Ask a question about your study material
          </label>
          <div className="flex items-start gap-3 px-4 pt-3.5 sm:px-5">
            <span
              aria-hidden="true"
              className="mt-[5px] hidden shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary sm:block"
            >
              Q.
            </span>
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
                "min-h-[28px] w-full resize-none bg-transparent py-0.5 text-base leading-relaxed text-foreground " +
                "placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed " +
                "scrollbar-thin"
              }
              aria-describedby="composer-help"
              aria-invalid={tooLong || undefined}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-border px-2.5 py-2 sm:px-3">
            <div className="flex min-w-0 items-center gap-3">
              {showMarks && (
                <MarksControl
                  options={marksOptions}
                  value={marks}
                  onChange={onMarksChange}
                  disabled={busy}
                />
              )}
              <p
                id="composer-help"
                className={cn(
                  "min-w-0 items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground",
                  showMarks ? "hidden md:flex" : "flex"
                )}
              >
                {showMarks && activeOption && (
                  <span className="mr-1 hidden xl:inline">{activeOption.hint} ·</span>
                )}
                <Kbd>Enter</Kbd> to send
                <span className="hidden lg:inline">
                  · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> new line
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {trimmed.length >= COUNTER_FROM && (
                <span
                  className={cn(
                    "tabular font-mono text-[11px]",
                    tooLong ? "font-semibold text-destructive" : "text-muted-foreground"
                  )}
                >
                  {trimmed.length}/{MAX_CHARS}
                </span>
              )}
              {busy ? (
                <Button variant="secondary" onClick={onCancel} className="px-4">
                  <Square className="fill-current" aria-hidden="true" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={!canSend}
                  aria-label="Send question"
                  className="w-11 px-0 sm:w-auto sm:px-5"
                >
                  <span className="hidden sm:inline">Ask</span>
                  <ArrowRight
                    className="transition-transform duration-150 ease-out group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>
          </div>
        </div>

        {tooLong && (
          <p role="alert" className="mt-2 font-mono text-[11px] text-destructive">
            That question is {trimmed.length - MAX_CHARS} characters too long. Shorten it and
            send again.
          </p>
        )}
      </div>
    </div>
  );
}
