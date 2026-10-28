import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const SHEETS = 5;
const LINES = [92, 78, 86, 54, 80, 66];

export default function PaperStack3D({ active = false, size = 140, className, style }) {
  const reduced = useReducedMotion();
  const gap = Math.max(4, size * 0.045);
  const flipping = active && !reduced;

  return (
    <div
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, perspective: size * 6, ...style }}
    >
      <div className={cn("h-full w-full", !reduced && !active && "animate-float")}>
        <div
          className="preserve-3d absolute left-1/2 top-1/2"
          style={{
            width: size * 0.5,
            height: size * 0.64,
            marginLeft: -size * 0.25,
            marginTop: -size * 0.36,
            transform: "rotateX(58deg) rotateZ(-38deg)",
          }}
        >
          <div
            className="absolute inset-0 rounded-[3px] bg-black"
            style={{ transform: `translate(${gap * 1.4}px, ${gap * 1.4}px) translateZ(-1px)` }}
          />
          {Array.from({ length: SHEETS }).map((_, index) => {
            const top = index === SHEETS - 1;
            const cover = index === 0;
            const flips = flipping && index >= SHEETS - 3;
            return (
              <div
                key={index}
                data-flip={flips ? "true" : undefined}
                className={cn(
                  "paper-sheet rounded-[3px] border-[1.5px] border-black",
                  cover ? "bg-primary" : index % 2 ? "bg-surface-raised" : "bg-surface"
                )}
                style={{
                  "--z": `${index * gap}px`,
                  "--flip-delay": `${(SHEETS - 1 - index) * 0.55}s`,
                }}
              >
                {(top || flips) && (
                  <div className="flex h-full flex-col justify-center gap-[7%] px-[14%]">
                    {LINES.map((width, line) => (
                      <span
                        key={line}
                        className={cn(
                          "block h-[1.5px] rounded-full",
                          line === 2 && top ? "h-[5px] bg-citron" : "bg-foreground/35"
                        )}
                        style={{ width: `${width}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
