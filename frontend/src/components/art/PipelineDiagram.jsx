import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { drawPath } from "@/lib/motion";

export const PIPELINE_STEPS = [
  { id: "pdf", label: "PDF", note: "pages" },
  { id: "chunks", label: "Chunks", note: "split" },
  { id: "vectors", label: "Vectors", note: "embed" },
  { id: "retrieve", label: "Retrieve", note: "top-k" },
  { id: "answer", label: "Answer", note: "cited" },
];

const XS = [72, 216, 360, 504, 648];
const Y = 96;

function glyphPaths(id, x) {
  const y = Y;
  switch (id) {
    case "pdf":
      return [
        `M ${x - 20} ${y - 28} H ${x + 8} L ${x + 22} ${y - 14} V ${y + 28} H ${x - 20} Z`,
        `M ${x + 8} ${y - 28} V ${y - 14} H ${x + 22}`,
        `M ${x - 12} ${y - 4} H ${x + 14} M ${x - 12} ${y + 5} H ${x + 10} M ${x - 12} ${y + 14} H ${x + 14}`,
      ];
    case "chunks":
      return [
        `M ${x - 24} ${y - 26} H ${x + 16} V ${y - 12} H ${x - 24} Z`,
        `M ${x - 18} ${y - 7} H ${x + 22} V ${y + 7} H ${x - 18} Z`,
        `M ${x - 24} ${y + 12} H ${x + 16} V ${y + 26} H ${x - 24} Z`,
      ];
    case "vectors":
      return [
        `M ${x - 24} ${y + 24} V ${y - 26} M ${x - 24} ${y + 24} H ${x + 26}`,
        `M ${x - 24} ${y + 24} L ${x + 16} ${y - 16} M ${x - 24} ${y + 24} L ${x + 20} ${y + 6} M ${x - 24} ${y + 24} L ${x - 4} ${y - 24}`,
        `M ${x + 16} ${y - 16} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M ${x + 20} ${y + 6} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M ${x - 4} ${y - 24} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`,
      ];
    case "retrieve":
      return [
        `M ${x - 4} ${y - 4} m -17 0 a 17 17 0 1 0 34 0 a 17 17 0 1 0 -34 0`,
        `M ${x + 9} ${y + 9} L ${x + 24} ${y + 24}`,
        `M ${x - 12} ${y - 8} H ${x + 4} M ${x - 12} ${y} H ${x}`,
      ];
    default:
      return [
        `M ${x - 24} ${y - 24} H ${x + 24} V ${y + 12} H ${x - 4} L ${x - 14} ${y + 24} V ${y + 12} H ${x - 24} Z`,
        `M ${x - 16} ${y - 14} H ${x + 16} M ${x - 16} ${y - 6} H ${x + 10}`,
        `M ${x - 16} ${y + 2} H ${x + 4}`,
      ];
  }
}

function resolveIndex(activeStep) {
  if (activeStep === null || activeStep === undefined) return -1;
  if (typeof activeStep === "number") return activeStep;
  return PIPELINE_STEPS.findIndex((step) => step.id === activeStep);
}

function Stroke({ d, delay = 0, active, width, drawn }) {
  return (
    <motion.path
      d={d}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={width ?? (active ? 2 : 1.25)}
      className={active ? "stroke-primary" : "stroke-foreground/70"}
      variants={drawn ? drawPath : undefined}
      custom={delay}
    />
  );
}

export default function PipelineDiagram({ activeStep, animate = true, className, showNotes = true }) {
  const reduced = useReducedMotion();
  const drawn = animate && !reduced;
  const activeIndex = resolveIndex(activeStep);

  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 720 184"
      className={cn("h-auto w-full overflow-visible", className)}
      initial={drawn ? "hidden" : false}
      whileInView={drawn ? "show" : undefined}
      viewport={{ once: true, amount: 0.4 }}
    >
      <line x1="16" x2="704" y1="168" y2="168" className="stroke-foreground/25" strokeWidth="1" />
      {Array.from({ length: 44 }).map((_, tick) => (
        <line
          key={tick}
          x1={16 + tick * 16}
          x2={16 + tick * 16}
          y1="168"
          y2={tick % 4 === 0 ? 160 : 164}
          className="stroke-foreground/25"
          strokeWidth="1"
        />
      ))}

      {PIPELINE_STEPS.map((step, index) => {
        const x = XS[index];
        const active = index === activeIndex;
        const done = activeIndex > index;
        const base = index * 0.22;
        return (
          <g key={step.id}>
            <line x1={x - 34} x2={x + 34} y1="34" y2="34" className="stroke-foreground/35" strokeWidth="1" />
            <line x1={x - 34} x2={x - 34} y1="29" y2="39" className="stroke-foreground/35" strokeWidth="1" />
            <line x1={x + 34} x2={x + 34} y1="29" y2="39" className="stroke-foreground/35" strokeWidth="1" />
            <text
              x={x}
              y="24"
              textAnchor="middle"
              className={cn("font-mono uppercase", active ? "fill-primary" : "fill-muted-foreground")}
              fontSize="11"
              fontWeight="600"
              letterSpacing="1"
            >
              {String(index + 1).padStart(2, "0")} {step.label}
            </text>

            {active && (
              <>
                <rect x={x - 36} y={Y - 38} width="76" height="76" rx="10" fill="#000" />
                <rect
                  x={x - 40}
                  y={Y - 42}
                  width="76"
                  height="76"
                  rx="10"
                  className="fill-primary-soft stroke-primary"
                  strokeWidth="2"
                />
              </>
            )}
            {!active && (
              <rect
                x={x - 38}
                y={Y - 38}
                width="76"
                height="76"
                rx="10"
                fill="none"
                className="stroke-foreground/20"
                strokeDasharray="2 4"
                strokeWidth="1"
              />
            )}

            <g transform={active ? "translate(-2 -4)" : undefined}>
              {glyphPaths(step.id, x).map((d, part) => (
                <Stroke key={part} d={d} delay={base + part * 0.1} active={active} drawn={drawn} />
              ))}
            </g>

            {done && <circle cx={x + 30} cy={Y - 30} r="4" className="fill-citron stroke-foreground" strokeWidth="1.5" />}

            {showNotes && (
              <text
                x={x}
                y="152"
                textAnchor="middle"
                className="fill-muted-foreground font-mono uppercase"
                fontSize="9.5"
                letterSpacing="1"
              >
                {step.note}
              </text>
            )}

            {index < PIPELINE_STEPS.length - 1 && (
              <>
                <Stroke
                  d={`M ${x + 44} ${Y} H ${XS[index + 1] - 46}`}
                  delay={base + 0.3}
                  active={done}
                  width={1.25}
                  drawn={drawn}
                />
                <Stroke
                  d={`M ${XS[index + 1] - 52} ${Y - 5} L ${XS[index + 1] - 46} ${Y} L ${XS[index + 1] - 52} ${Y + 5}`}
                  delay={base + 0.5}
                  active={done}
                  width={1.25}
                  drawn={drawn}
                />
              </>
            )}
          </g>
        );
      })}
    </motion.svg>
  );
}
