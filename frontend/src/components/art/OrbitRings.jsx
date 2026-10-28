import { useRef } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const RINGS = [
  { tilt: -18, rx: 82, ry: 24, speed: 0.9, phase: 0.4, tone: "fill-citron" },
  { tilt: 36, rx: 74, ry: 22, speed: -0.65, phase: 2.2, tone: "fill-primary" },
  { tilt: 98, rx: 66, ry: 20, speed: 0.5, phase: 4.1, tone: "fill-surface-raised" },
];

const CENTER = 100;

export default function OrbitRings({ size = 140, active = true, className, style }) {
  const reduced = useReducedMotion();
  const dots = useRef([]);
  const time = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    time.current += (delta / 1000) * (activeRef.current ? 1.6 : 0.5);
    RINGS.forEach((ring, index) => {
      const node = dots.current[index];
      if (!node) return;
      const theta = time.current * ring.speed + ring.phase;
      const x = CENTER + ring.rx * Math.cos(theta);
      const y = CENTER + ring.ry * Math.sin(theta);
      const depth = Math.sin(theta);
      node.setAttribute("cx", x.toFixed(2));
      node.setAttribute("cy", y.toFixed(2));
      node.setAttribute("r", (5.5 + depth * 1.6).toFixed(2));
      node.style.opacity = depth < -0.2 ? "0.55" : "1";
    });
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", className)}
      style={style}
    >
      {RINGS.map((ring, index) => (
        <g key={index} transform={`rotate(${ring.tilt} ${CENTER} ${CENTER})`}>
          <ellipse
            cx={CENTER}
            cy={CENTER}
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            className="stroke-foreground/45"
            strokeWidth="1"
            strokeDasharray={index === 1 ? "3 4" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      <circle cx={CENTER + 4} cy={CENTER + 4} r="24" fill="#000" />
      <circle cx={CENTER} cy={CENTER} r="24" className="fill-primary" stroke="#000" strokeWidth="2.5" />
      <text
        x={CENTER}
        y={CENTER + 9}
        textAnchor="middle"
        className="fill-primary-foreground font-display"
        fontSize="26"
        fontWeight="600"
      >
        ¶
      </text>
      {RINGS.map((ring, index) => (
        <g key={index} transform={`rotate(${ring.tilt} ${CENTER} ${CENTER})`}>
          <circle
            ref={(node) => {
              dots.current[index] = node;
            }}
            cx={CENTER + ring.rx * Math.cos(ring.phase)}
            cy={CENTER + ring.ry * Math.sin(ring.phase)}
            r="5.5"
            className={ring.tone}
            stroke="#000"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  );
}
