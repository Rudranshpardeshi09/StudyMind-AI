import { useRef } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const FACES = [
  { glyph: "¶", transform: (h) => `translateZ(${h}px)`, tone: "bg-primary text-primary-foreground" },
  { glyph: "§", transform: (h) => `rotateY(180deg) translateZ(${h}px)`, tone: "bg-ink text-citron dark:bg-bone dark:text-ink" },
  { glyph: "?", transform: (h) => `rotateY(90deg) translateZ(${h}px)`, tone: "bg-citron text-citron-foreground" },
  { glyph: "✶", transform: (h) => `rotateY(-90deg) translateZ(${h}px)`, tone: "bg-surface-raised text-foreground" },
  { glyph: "∑", transform: (h) => `rotateX(90deg) translateZ(${h}px)`, tone: "bg-primary text-primary-foreground" },
  { glyph: "◎", transform: (h) => `rotateX(-90deg) translateZ(${h}px)`, tone: "bg-ink text-bone dark:bg-bone dark:text-ink" },
];

const BASE_DEG_PER_MS = 360 / 28000;

export default function Cube3D({ speed = 1, size = 96, className, style }) {
  const reduced = useReducedMotion();
  const cubeRef = useRef(null);
  const angle = useRef(32);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useAnimationFrame((_, delta) => {
    if (reduced || !cubeRef.current) return;
    angle.current = (angle.current + delta * BASE_DEG_PER_MS * speedRef.current) % 360;
    const a = angle.current;
    cubeRef.current.style.transform = `rotateX(${-22 + Math.sin((a * Math.PI) / 180) * 14}deg) rotateY(${a}deg) rotateZ(${a * 0.25}deg)`;
  });

  const half = size / 2;
  const cube = size * 0.62;
  const cubeHalf = cube / 2;

  return (
    <div
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, perspective: size * 7, ...style }}
    >
      <div
        className="absolute rounded-full bg-black/80 blur-[1px]"
        style={{ width: cube * 0.9, height: cube * 0.14, bottom: size * 0.04, left: half - cube * 0.45 }}
      />
      <div
        ref={cubeRef}
        className="preserve-3d relative"
        style={{
          width: cube,
          height: cube,
          transform: "rotateX(-22deg) rotateY(32deg) rotateZ(8deg)",
        }}
      >
        {FACES.map((face) => (
          <div
            key={face.glyph}
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-[4px] border-2 border-black font-display font-semibold leading-none",
              face.tone
            )}
            style={{ transform: face.transform(cubeHalf), fontSize: cube * 0.48 }}
          >
            {face.glyph}
          </div>
        ))}
      </div>
    </div>
  );
}
