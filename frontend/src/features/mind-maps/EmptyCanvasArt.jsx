import { motion } from "framer-motion";

import { Cube3D, Sticker } from "@/components/art";
import { drawPath, useReducedMotionSafe } from "@/lib/motion";

const BRANCHES = [
  { d: "M 214 120 C 262 120, 262 52, 312 52", end: [312, 52], side: 1 },
  { d: "M 214 120 C 268 120, 268 120, 318 120", end: [318, 120], side: 1 },
  { d: "M 214 120 C 262 120, 262 188, 312 188", end: [312, 188], side: 1 },
  { d: "M 146 120 C 98 120, 98 70, 48 70", end: [48, 70], side: -1 },
  { d: "M 146 120 C 98 120, 98 170, 48 170", end: [48, 170], side: -1 },
];

const LEAVES = [
  { d: "M 364 52 C 382 52, 382 34, 398 34", end: [398, 34] },
  { d: "M 364 52 C 382 52, 382 70, 398 70", end: [398, 70] },
  { d: "M 364 188 C 382 188, 382 206, 398 206", end: [398, 206] },
  { d: "M -4 70 C -16 70, -16 56, -26 56", end: [-26, 56] },
];

export default function EmptyCanvasArt() {
  const m = useReducedMotionSafe();
  const draw = m.variants(drawPath);

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[420px]">
      <motion.svg
        viewBox="-40 0 460 240"
        className="h-auto w-full overflow-visible text-foreground"
        initial={m.initial}
        animate="show"
      >
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          {BRANCHES.map((branch, index) => (
            <motion.path
              key={branch.d}
              d={branch.d}
              strokeWidth={1.25}
              strokeOpacity={0.7}
              variants={draw}
              custom={0.2 + index * 0.12}
            />
          ))}
          {LEAVES.map((leaf, index) => (
            <motion.path
              key={leaf.d}
              d={leaf.d}
              strokeWidth={1}
              strokeOpacity={0.45}
              strokeDasharray="3 3"
              variants={draw}
              custom={0.9 + index * 0.1}
            />
          ))}
          <circle cx="180" cy="120" r="54" strokeOpacity={0.25} strokeDasharray="2 4" />
          <circle cx="180" cy="120" r="76" strokeOpacity={0.12} />
        </g>

        {BRANCHES.map((branch, index) => {
          const [x, y] = branch.end;
          const left = branch.side < 0;
          return (
            <g key={`n-${index}`}>
              <rect
                x={left ? x - 52 : x}
                y={y - 11}
                width="52"
                height="22"
                rx="5"
                className={index === 1 ? "fill-primary" : "fill-surface-raised"}
                stroke="hsl(var(--border-strong))"
                strokeWidth="1.5"
              />
              <line
                x1={left ? x - 44 : x + 8}
                x2={left ? x - 16 : x + 36}
                y1={y}
                y2={y}
                stroke={index === 1 ? "hsl(var(--primary-foreground))" : "currentColor"}
                strokeOpacity={index === 1 ? 0.9 : 0.35}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {LEAVES.map((leaf, index) => (
          <circle
            key={`l-${index}`}
            cx={leaf.end[0]}
            cy={leaf.end[1]}
            r="3.5"
            className="fill-citron"
            stroke="hsl(var(--border-strong))"
            strokeWidth="1.25"
          />
        ))}

        <g className="fill-muted-foreground font-mono" fontSize="8.5" letterSpacing="0.8">
          <text x="180" y="226" textAnchor="middle">
            FIG. 00 — ROOT / BRANCH / LEAF
          </text>
          <text x="318" y="148">
            B.02
          </text>
          <text x="-6" y="198" textAnchor="end">
            B.05
          </text>
        </g>
        <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1">
          <line x1="126" x2="234" y1="210" y2="210" />
          <line x1="126" x2="126" y1="206" y2="214" />
          <line x1="234" x2="234" y1="206" y2="214" />
        </g>
      </motion.svg>

      <div className="pointer-events-none absolute left-[47.8%] top-[50%] -translate-x-1/2 -translate-y-1/2">
        <Cube3D size={92} speed={0.8} />
      </div>

      <Sticker tone="citron" rotate={-6} className="absolute -top-1 left-[6%]">
        blank canvas
      </Sticker>
    </div>
  );
}
