import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Square } from "lucide-react";

import { Cube3D, GridPaper, Marquee, OrbitRings, PaperStack3D, Squiggle } from "@/components/art";
import { Button } from "@/components/ui/button";
import { springPop, springPress } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const SLANG = {
  preparing: [
    "warming up the brain cells",
    "stretching before the big think",
    "loading main-character energy",
  ],
  retrieving: [
    "lowkey speed-reading your notes",
    "digging through the pages fr",
    "searching like it's finals week",
  ],
  analyzing: [
    "vibe-checking every passage",
    "separating the facts from the fluff",
    "connecting dots, respectfully",
  ],
  generating: [
    "cooking up the answer — chef's kiss incoming",
    "writing it like it's due at midnight",
    "big brain mode: activated",
  ],
  validating: [
    "pinning the receipts (citations)",
    "stapling the sources",
    "almost there, no cap",
  ],
  mindmap: [
    "branching out, respectfully",
    "mapping the lore",
    "drawing the galaxy brain",
    "untangling the spaghetti",
  ],
};

const STAGE_ORDER = ["preparing", "retrieving", "analyzing", "generating", "validating"];

const TAPE = {
  answer: ["Cooking", "No cap", "Big brain", "Reading your notes"],
  mindmap: ["Cooking", "No cap", "Galaxy brain", "Mapping the lore"],
};

const GLYPHS = ["¶", "§", "?", "✶", "∑", "◎", "!", "∞"];
const BUBBLE_TONES = [
  "bg-citron text-citron-foreground",
  "bg-primary text-primary-foreground",
  "bg-surface-raised text-foreground",
];
const SLOTS = [
  [8, 30],
  [24, 68],
  [40, 26],
  [57, 66],
  [73, 30],
  [90, 64],
];
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#§¶∑";
const ROTATE_MS = 2200;

function pickNext(pool, previous) {
  if (pool.length < 2) return pool[0];
  let next = previous;
  while (next === previous) next = pool[Math.floor(Math.random() * pool.length)];
  return next;
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function useElapsed(elapsedSeconds, startedAt) {
  const [now, setNow] = useState(() => Date.now());
  const controlled = typeof elapsedSeconds === "number";

  useEffect(() => {
    if (controlled || !startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [controlled, startedAt]);

  if (controlled) return elapsedSeconds;
  if (!startedAt) return 0;
  const start = startedAt instanceof Date ? startedAt.getTime() : startedAt;
  return (now - start) / 1000;
}

function useRotatingLine(pool, reduced) {
  const [line, setLine] = useState(() => pickNext(pool, null));
  const poolKey = pool.join("|");

  useEffect(() => {
    setLine((previous) => (pool.includes(previous) ? previous : pickNext(pool, previous)));
    const id = setInterval(() => setLine((previous) => pickNext(pool, previous)), reduced ? ROTATE_MS * 1.6 : ROTATE_MS);
    return () => clearInterval(id);
  }, [poolKey, reduced]);

  return line;
}

function useScramble(text, enabled) {
  const [output, setOutput] = useState(text);

  useEffect(() => {
    if (!enabled) {
      setOutput(text);
      return undefined;
    }
    let frame = 0;
    const total = Math.max(12, Math.round(text.length * 0.9));
    const id = setInterval(() => {
      frame += 1;
      const revealed = Math.floor((frame / total) * text.length);
      let next = "";
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (index < revealed || char === " ") next += char;
        else next += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setOutput(next);
      if (revealed >= text.length) {
        setOutput(text);
        clearInterval(id);
      }
    }, 28);
    return () => clearInterval(id);
  }, [text, enabled]);

  return output;
}

function StageObject({ stage, mode, size }) {
  if (mode === "mindmap") {
    return stage === "validating" ? (
      <OrbitRings size={size} active />
    ) : (
      <Cube3D size={size} speed={2.2} />
    );
  }
  if (stage === "retrieving" || stage === "analyzing") return <PaperStack3D size={size} active />;
  if (stage === "generating") return <Cube3D size={size} speed={4} />;
  if (stage === "validating") return <OrbitRings size={size} active />;
  return <Cube3D size={size} speed={1} />;
}

function objectKey(stage, mode) {
  if (mode === "mindmap") return stage === "validating" ? "orbit" : "cube";
  if (stage === "retrieving" || stage === "analyzing") return "paper";
  if (stage === "validating") return "orbit";
  return "cube";
}

function counterCopy(count) {
  if (count === 0) return "psst — pop a thought while you wait";
  if (count === 1) return "you popped 1 thought";
  if (count < 5) return `you popped ${count} thoughts`;
  if (count < 15) return `you popped ${count} thoughts — certified multitasker`;
  return `you popped ${count} thoughts — legendary procrastinator`;
}

let bubbleSeed = 0;

function makeBubble(slot) {
  bubbleSeed += 1;
  return {
    id: bubbleSeed,
    slot,
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    tone: BUBBLE_TONES[Math.floor(Math.random() * BUBBLE_TONES.length)],
    size: 44 + Math.round(Math.random() * 10),
    delay: Math.random() * 1.8,
  };
}

function Burst({ x, y, reduced }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, index) => {
        const angle = (index / 9) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 26 + Math.random() * 22;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          tone: index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-citron" : "bg-foreground",
          size: 5 + Math.round(Math.random() * 4),
        };
      }),
    []
  );

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {!reduced &&
        particles.map((particle, index) => (
          <motion.span
            key={index}
            className={cn("absolute rounded-full border border-black", particle.tone)}
            style={{ width: particle.size, height: particle.size, marginLeft: -particle.size / 2, marginTop: -particle.size / 2 }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: particle.dx, y: particle.dy, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      <motion.span
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary"
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: reduced ? 0 : -26, opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.7, ease: "easeOut" }}
      >
        pop!
      </motion.span>
    </span>
  );
}

function BubbleField({ reduced }) {
  const [bubbles, setBubbles] = useState(() => SLOTS.map((_, slot) => makeBubble(slot)));
  const [bursts, setBursts] = useState([]);
  const [count, setCount] = useState(0);
  const buttons = useRef(new Map());
  const timers = useRef([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  const pop = useCallback((bubble, event) => {
    const hadFocus = event.currentTarget === document.activeElement;
    const [x, y] = SLOTS[bubble.slot];
    const burstId = `${bubble.id}-burst`;
    setCount((value) => value + 1);
    setBursts((list) => [...list, { id: burstId, x, y }]);
    setBubbles((list) => {
      const remaining = list.filter((item) => item.id !== bubble.id);
      if (hadFocus) {
        const target = remaining.find((item) => item.slot > bubble.slot) ?? remaining[0];
        if (target) requestAnimationFrame(() => buttons.current.get(target.id)?.focus());
      }
      return remaining;
    });
    timers.current.push(
      setTimeout(() => setBursts((list) => list.filter((item) => item.id !== burstId)), 800),
      setTimeout(() => setBubbles((list) => [...list, makeBubble(bubble.slot)]), 900 + Math.random() * 600)
    );
  }, []);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="eyebrow">Poke the brain</p>
        <p className="font-mono text-[11px] text-muted-foreground tabular">{counterCopy(count)}</p>
      </div>
      <div className="relative mt-2 h-32 overflow-hidden rounded-control border border-dashed border-border bg-surface-sunk/60">
        <GridPaper cell={16} />
        <AnimatePresence>
          {bubbles.map((bubble) => {
            const [x, y] = SLOTS[bubble.slot];
            return (
              <motion.button
                key={bubble.id}
                ref={(node) => {
                  if (node) buttons.current.set(bubble.id, node);
                  else buttons.current.delete(bubble.id);
                }}
                type="button"
                aria-label="Pop a thought bubble"
                onClick={(event) => pop(bubble, event)}
                className={cn(
                  "absolute flex items-center justify-center rounded-full border-2 border-black shadow-hs-sm outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring",
                  bubble.tone
                )}
                style={{
                  left: `calc(${x}% - ${bubble.size / 2}px)`,
                  top: `calc(${y}% - ${bubble.size / 2}px)`,
                  width: bubble.size,
                  height: bubble.size,
                }}
                initial={reduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={
                  reduced
                    ? { opacity: 1 }
                    : {
                        scale: 1,
                        opacity: 1,
                        y: [0, -7, 0],
                        transition: {
                          scale: springPop,
                          opacity: { duration: 0.15 },
                          y: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: bubble.delay },
                        },
                      }
                }
                exit={reduced ? { opacity: 0, transition: { duration: 0.1 } } : { scale: 1.45, opacity: 0, transition: { duration: 0.16 } }}
                whileHover={reduced ? undefined : { scale: 1.08, transition: springPress }}
                whileTap={reduced ? undefined : { scale: 0.86, transition: springPress }}
              >
                <span className="font-display text-lg font-semibold leading-none" aria-hidden="true">
                  {bubble.glyph}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 -left-1 size-2.5 rounded-full border-[1.5px] border-black bg-surface-raised"
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
        {bursts.map((burst) => (
          <Burst key={burst.id} x={burst.x} y={burst.y} reduced={reduced} />
        ))}
      </div>
    </div>
  );
}

function SlangLine({ line, reduced, compact }) {
  const scrambled = useScramble(line, !reduced);
  return (
    <div aria-hidden="true" className="min-w-0">
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={reduced ? line : "scramble"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "display-italic text-foreground",
              compact
                ? "text-lg leading-snug sm:text-xl"
                : "min-h-[2.4em] text-[1.65rem] leading-[1.1] sm:min-h-[2.2em] sm:text-[2.1rem]"
            )}
          >
            {scrambled}
            {!reduced && (
              <span className="ml-0.5 inline-block h-[0.8em] w-[0.08em] translate-y-[0.08em] bg-primary align-baseline animate-blink" />
            )}
          </motion.p>
        </AnimatePresence>
      </div>
      <Squiggle
        className={compact ? "mt-1" : "mt-2"}
        width={compact ? 120 : 220}
        height={compact ? 10 : 14}
        strokeWidth={compact ? 2.5 : 3.5}
        animate={!reduced}
      />
    </div>
  );
}

export default function ThinkingStage({
  stage,
  stageLabel,
  detail,
  elapsedSeconds,
  startedAt,
  mode = "answer",
  onCancel,
  cancelLabel = "Stop",
  compact = false,
  interactive = true,
  className,
}) {
  const reduced = useReducedMotion() ?? false;
  const elapsed = useElapsed(elapsedSeconds, startedAt);
  const poolKey = mode === "mindmap" ? "mindmap" : SLANG[stage] ? stage : "preparing";
  const line = useRotatingLine(SLANG[poolKey], reduced);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const label = stageLabel || (mode === "mindmap" ? "Generating mind map" : "Working on it");
  const counter =
    mode === "answer" && stageIndex >= 0
      ? `${String(stageIndex + 1).padStart(2, "0")} / ${String(STAGE_ORDER.length).padStart(2, "0")}`
      : null;
  const clock = formatClock(elapsed);

  const status = (
    <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
        <span className="relative flex size-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        {counter && <span className="text-primary">{counter}</span>}
        <span className="min-w-0 break-words">{label}</span>
      </p>
      {detail && (
        <p
          className="mt-1 line-clamp-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground"
          title={typeof detail === "string" ? detail : undefined}
        >
          {detail}
        </p>
      )}
    </div>
  );

  const cancel = onCancel && (
    <Button variant="secondary" size="sm" onClick={onCancel} aria-label={cancelLabel === "Stop" ? "Stop generating" : cancelLabel}>
      <Square className="fill-current" aria-hidden="true" />
      {cancelLabel}
    </Button>
  );

  const timer = (
    <span
      className="font-mono text-xs font-semibold tabular text-muted-foreground"
      aria-label={`${Math.floor(elapsed)} seconds elapsed`}
      role="timer"
    >
      {clock}
    </span>
  );

  const object = (size) => (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={objectKey(stage, mode)}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 12 }}
        transition={reduced ? { duration: 0.12 } : springPop}
      >
        <StageObject stage={stage} mode={mode} size={size} />
      </motion.div>
    </AnimatePresence>
  );

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-card border-2 border-border-strong bg-surface p-3 shadow-hs sm:gap-4 sm:p-4",
          className
        )}
      >
        <div className="relative hidden shrink-0 min-[400px]:block">{object(64)}</div>
        <div className="min-w-0 flex-1 space-y-2">
          <SlangLine line={line} reduced={reduced} compact />
          {status}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {timer}
          {cancel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border-2 border-border-strong bg-surface shadow-hs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-border-strong bg-surface-raised px-4 py-2.5 sm:px-5">
        <p className="eyebrow flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-primary">{mode === "mindmap" ? "Mind map" : "Answer"}</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">the brain is cooking</span>
        </p>
        <div className="flex items-center gap-3">
          {timer}
          {cancel}
        </div>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6">
        <div className="relative flex size-[92px] items-center justify-center overflow-hidden rounded-control border border-border bg-surface-sunk sm:size-[140px]">
          <GridPaper cell={14} />
          <div className="relative shrink-0 scale-[0.68] sm:scale-100">{object(128)}</div>
        </div>
        <div className="min-w-0">
          <SlangLine line={line} reduced={reduced} />
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-6">{status}</div>

      <Marquee items={TAPE[mode] ?? TAPE.answer} tilt={-2} speed={24} className="-my-1" />

      {interactive && (
        <div className="px-4 pb-5 pt-4 sm:px-6">
          <BubbleField reduced={reduced} />
        </div>
      )}
    </div>
  );
}
