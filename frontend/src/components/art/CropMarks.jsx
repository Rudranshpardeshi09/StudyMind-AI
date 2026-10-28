import { cn } from "@/lib/utils";

const CORNERS = [
  "left-0 top-0 border-l border-t",
  "right-0 top-0 border-r border-t",
  "bottom-0 left-0 border-b border-l",
  "bottom-0 right-0 border-b border-r",
];

const OFFSETS = [
  (o) => ({ transform: `translate(${-o}px, ${-o}px)` }),
  (o) => ({ transform: `translate(${o}px, ${-o}px)` }),
  (o) => ({ transform: `translate(${-o}px, ${o}px)` }),
  (o) => ({ transform: `translate(${o}px, ${o}px)` }),
];

export default function CropMarks({ size = 14, offset = 8, className }) {
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {CORNERS.map((corner, index) => (
        <span
          key={corner}
          className={cn("absolute border-foreground/55", corner)}
          style={{ width: size, height: size, ...OFFSETS[index](offset) }}
        />
      ))}
    </span>
  );
}
