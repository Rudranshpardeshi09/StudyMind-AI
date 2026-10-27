import { memo, useMemo } from "react";

import { roughArrowhead, roughConnector } from "./sketch";

const SketchyEdge = memo(function SketchyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data = {},
}) {
  const { color = "hsl(var(--border-strong))", depth = 1, sketch = true, dimmed } = data;

  const { strokes, head } = useMemo(() => {
    if (!sketch) {
      const direction = Math.sign(targetX - sourceX) || 1;
      const pull =
        Math.max(40, Math.min(Math.abs(targetX - sourceX) * 0.55, 160)) * direction;
      return {
        strokes: [
          `M ${sourceX} ${sourceY} C ${sourceX + pull} ${sourceY}, ${targetX - pull} ${targetY}, ${targetX} ${targetY}`,
        ],
        head: null,
      };
    }

    const paths = roughConnector(sourceX, sourceY, targetX, targetY, id, {
      wobble: depth <= 1 ? 2 : depth === 2 ? 1.5 : 1.1,
    });
    const angle = Math.atan2(targetY - sourceY, (targetX - sourceX) * 0.35);
    return { strokes: paths, head: roughArrowhead(targetX, targetY, angle, id) };
  }, [id, sourceX, sourceY, targetX, targetY, depth, sketch]);

  const width = depth <= 1 ? 2.4 : depth === 2 ? 1.9 : 1.5;

  return (
    <g
      className="pointer-events-none transition-opacity duration-200"
      style={{ opacity: dimmed ? 0.18 : 1 }}
    >
      {strokes.map((path, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={index === 0 ? width : width * 0.6}
          strokeOpacity={index === 0 ? 0.95 : 0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {head && (
        <path
          d={head}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeOpacity={0.95}
          strokeLinecap="round"
        />
      )}
    </g>
  );
});

export default SketchyEdge;
