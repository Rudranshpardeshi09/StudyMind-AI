import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Cube3D, CropMarks, GridPaper, OrbitRings, PaperStack3D, Sticker } from "@/components/art";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const AUTH_LINES = [
  { lead: "Ask your textbook", emphasis: "anything." },
  { lead: "Get the page it", emphasis: "came from." },
  { lead: "Receipts included,", emphasis: "no cap." },
  { lead: "Your notes, your index,", emphasis: "only yours." },
  { lead: "Dense chapter? Make it a", emphasis: "mind map." },
];

export function RotatingLine({ className, interval = 3200, size = "default" }) {
  const m = useReducedMotionSafe();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((value) => (value + 1) % AUTH_LINES.length), interval);
    return () => window.clearInterval(id);
  }, [interval]);

  const line = AUTH_LINES[index];
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={index}
          initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: -14, filter: "blur(4px)" }}
          transition={{ duration: m.reduced ? 0.15 : 0.45, ease: EASE_OUT }}
          className={cn(
            "display text-foreground",
            size === "lg" ? "text-[3.5rem] xl:text-[4.5rem]" : "text-[2.25rem] sm:text-[2.75rem]"
          )}
        >
          {line.lead} <em className="display-italic text-primary">{line.emphasis}</em>
        </motion.p>
      </AnimatePresence>
      <div className="mt-5 flex gap-1.5">
        {AUTH_LINES.map((item, dot) => (
          <span
            key={item.emphasis}
            className={cn(
              "h-1.5 rounded-full border border-black transition-all duration-300",
              dot === index ? "w-8 bg-primary" : "w-1.5 bg-foreground/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function AuthArt({ className }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <CropMarks size={16} offset={10} />
      <div className="relative h-[360px] overflow-hidden rounded-hero border border-border bg-surface xl:h-[400px]">
        <GridPaper cell={24} />
        <span className="absolute left-4 top-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Plate 02 — the index
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <OrbitRings size={340} active={false} />
        </div>
        <div className="absolute left-[18%] top-1/2 -translate-y-1/2">
          <PaperStack3D size={200} />
        </div>
        <div className="absolute right-[16%] top-[18%]">
          <Cube3D size={78} speed={0.9} />
        </div>
      </div>
      <Sticker tone="citron" rotate={-6} className="absolute -left-3 bottom-10">
        p.12 ✓
      </Sticker>
      <Sticker tone="cherry" rotate={5} className="absolute -right-3 top-12">
        cited
      </Sticker>
    </div>
  );
}
