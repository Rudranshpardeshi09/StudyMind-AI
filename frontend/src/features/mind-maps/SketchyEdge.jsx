import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { EASE_DRAW } from "@/lib/motion";
import { roughConnector } from "./sketch";

const INK = "hsl(var(--foreground))";

const SketchyEdge = memo(function SketchyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data = {},
}) {
  const {
    color = "hsl(var(--border-strong))",
    depth = 1,
    sketch = true,
    dimmed,
    reveal = null,
  } = data;
  const reduced = useReducedMotion();
  const animateIn = reveal !== null && !reduced;

  const { strokes, dot } = useMemo(() => {
    const direction = Math.sign(targetX - sourceX) || 1;
    const dot = { x: targetX - direction * 7, y: targetY };
    if (!sketch) {
      const pull = Math.max(40, Math.min(Math.abs(targetX - sourceX) * 0.55, 160)) * direction;
      return {
        strokes: [
          `M ${sourceX} ${sourceY} C ${sourceX + pull} ${sourceY}, ${targetX - pull} ${targetY}, ${targetX} ${targetY}`,
        ],
        dot,
      };
    }

    const paths = roughConnector(sourceX, sourceY, targetX, targetY, id, {
      wobble: depth <= 1 ? 2 : depth === 2 ? 1.5 : 1.1,
    });
    return { strokes: paths, dot };
  }, [id, sourceX, sourceY, targetX, targetY, depth, sketch]);

  const width = depth <= 1 ? 2 : depth === 2 ? 1.4 : 1.1;
  const opacity = depth <= 1 ? 0.9 : depth === 2 ? 0.6 : 0.45;

  return (
    <g
      className="pointer-events-none transition-opacity duration-200"
      style={{ opacity: dimmed ? 0.14 : 1 }}
    >
      {strokes.map((path, index) => (
        <motion.path
          key={index}
          d={path}
          fill="none"
          stroke={INK}
          strokeWidth={index === 0 ? width : width * 0.55}
          strokeOpacity={index === 0 ? opacity : opacity * 0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animateIn ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_DRAW, delay: reveal ?? 0 }}
        />
      ))}
      <motion.circle
        cx={dot.x}
        cy={dot.y}
        r={depth <= 1 ? 4 : 3}
        fill={color}
        stroke={INK}
        strokeWidth={1.25}
        initial={animateIn ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, delay: (reveal ?? 0) + 0.55 }}
        style={{
          transformOrigin: `${dot.x}px ${dot.y}px`,
          transformBox: "view-box",
        }}
      />
    </g>
  );
});

export default SketchyEdge;
