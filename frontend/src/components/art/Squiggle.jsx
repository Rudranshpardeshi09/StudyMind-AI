import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const WAVE = 24;
const TONES = {
  citron: "stroke-citron",
  cherry: "stroke-primary",
  ink: "stroke-foreground",
};

function wavePath(amplitude, mid, count) {
  let d = `M ${-WAVE * 2} ${mid} q ${WAVE / 4} ${-amplitude} ${WAVE / 2} 0`;
  for (let index = 0; index < count; index += 1) d += ` t ${WAVE / 2} 0`;
  return d;
}

export default function Squiggle({
  color = "citron",
  animate = true,
  width = "100%",
  height = 14,
  strokeWidth = 3.5,
  outline = color === "citron",
  className,
}) {
  const reduced = useReducedMotion();
  const moving = animate && !reduced;
  const mid = height / 2;
  const amplitude = Math.max(2, mid - strokeWidth);
  const d = wavePath(amplitude, mid, 220);

  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      className={cn("block max-w-full overflow-hidden", className)}
    >
      <g className={moving ? "animate-squiggle" : undefined}>
        {outline && (
          <path
            d={d}
            fill="none"
            className="stroke-foreground"
            strokeWidth={strokeWidth + 2.5}
            strokeLinecap="round"
          />
        )}
        <path
          d={d}
          fill="none"
          className={TONES[color] ?? TONES.citron}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
