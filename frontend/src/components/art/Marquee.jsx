import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const DEFAULT_ITEMS = ["Cooking", "No cap", "Big brain", "Reading your notes"];

export default function Marquee({
  items = DEFAULT_ITEMS,
  speed = 30,
  tilt = -2,
  separator = "•",
  className,
  tapeClassName,
}) {
  const reduced = useReducedMotion();
  const pad = `${(Math.abs(Math.tan((tilt * Math.PI) / 180)) * 52).toFixed(2)}%`;
  const sequence = [...items, ...items, ...items];

  const run = (copy) => (
    <div className="flex shrink-0 items-center" aria-hidden={copy > 0 || undefined}>
      {sequence.map((item, index) => (
        <span key={`${copy}-${index}`} className="flex items-center">
          <span className="px-3">{item}</span>
          <span className="opacity-60">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none relative w-full overflow-hidden", className)}
      style={{ paddingBlock: pad }}
    >
      <div
        className={cn("tape -mx-[4%] w-[108%] py-1.5", tapeClassName)}
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <div
          className={cn(
            "flex w-max font-mono text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs",
            !reduced && "animate-marquee"
          )}
          style={{ "--marquee-duration": `${speed}s` }}
        >
          {run(0)}
          {run(1)}
        </div>
      </div>
    </div>
  );
}
