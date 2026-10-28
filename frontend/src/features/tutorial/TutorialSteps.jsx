import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

import { BigNumeral, Cube3D, OrbitRings, PaperStack3D, Sticker } from "@/components/art";
import { riseIn, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

const CONNECTOR = "M 29 4 C 29 22, 71 18, 71 36 C 71 52, 29 48, 29 64 C 29 80, 71 76, 71 96";

function StepArt({ index }) {
  if (index === 0) return <PaperStack3D size={130} />;
  if (index === 1) return <OrbitRings size={150} active={false} />;
  if (index === 2)
    return (
      <div className="flex flex-col items-start gap-2.5">
        <Sticker tone="cherry" rotate={-6}>
          p.42 ✓
        </Sticker>
        <Sticker tone="paper" shape="tag" rotate={3}>
          document.pdf
        </Sticker>
      </div>
    );
  return <Cube3D size={84} speed={0.9} />;
}

const CAPTIONS = [
  "Fig. a — Pages in, passages out.",
  "Fig. b — Passages orbiting your question.",
  "Fig. c — The receipt, stapled on.",
  "Fig. d — One topic, many branches.",
];

export default function TutorialSteps({ steps, scrollRef }) {
  const m = useReducedMotionSafe();
  const listRef = useRef(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: listRef,
    offset: ["start 70%", "end 70%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <ol ref={listRef} className="relative space-y-10 md:space-y-6">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block"
      >
        <path
          d={CONNECTOR}
          fill="none"
          className="stroke-foreground/25"
          strokeWidth="1"
          strokeDasharray="3 5"
          vectorEffect="non-scaling-stroke"
        />
        <motion.path
          d={CONNECTOR}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: m.reduced ? 1 : progress }}
        />
      </svg>

      {steps.map((step, index) => {
        const right = index % 2 === 1;
        return (
          <motion.li
            key={step.title}
            variants={m.variants(riseIn)}
            initial={m.initial}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="relative grid grid-cols-1 items-center gap-4 md:grid-cols-12 md:gap-6 md:py-6"
          >
            <div
              aria-hidden="true"
              className={cn(
                "relative flex items-end justify-between gap-4 md:row-start-1 md:flex-col md:items-start md:justify-center",
                right ? "md:col-span-4 md:col-start-1 md:items-end md:text-right" : "md:col-span-4 md:col-start-9"
              )}
            >
              <BigNumeral
                value={index + 1}
                size="xl"
                className="text-foreground/[0.09]"
              />
              <div className={cn("flex flex-col gap-3", right ? "md:items-end" : "md:items-start")}>
                <div className="flex min-h-[90px] items-center">
                  <StepArt index={index} />
                </div>
                <p className="hidden max-w-[22ch] font-mono text-[11px] leading-relaxed text-muted-foreground md:block">
                  {CAPTIONS[index]}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "relative md:row-start-1",
                right ? "md:col-span-7 md:col-start-6" : "md:col-span-7 md:col-start-1"
              )}
            >
              <article className="lift-card relative rounded-card border-2 border-border-strong bg-surface p-6 shadow-hs sm:p-7">
                <p className="eyebrow">
                  <span className="text-primary">Step {String(index + 1).padStart(2, "0")}</span> / 04
                </p>
                <h2 className="mt-3 flex items-center gap-3 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-[2rem]">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-control border-2 border-black shadow-hs-sm",
                      index % 2 === 0 ? "bg-citron text-citron-foreground" : "bg-primary text-primary-foreground"
                    )}
                  >
                    <step.icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  {step.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.body}</p>
                <p className="mt-4 rounded-control border border-border bg-surface-sunk px-3.5 py-2.5 text-sm leading-relaxed text-foreground/80">
                  <span className="mr-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-primary">
                    Note
                  </span>
                  {step.detail}
                </p>
              </article>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
