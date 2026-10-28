import { cn } from "@/lib/utils";

export default function GridPaper({ cell = 24, fade = true, className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid-paper pointer-events-none absolute inset-0",
        fade && "grid-paper-fade",
        className
      )}
      style={{ backgroundSize: `${cell}px ${cell}px` }}
    />
  );
}
