import { cn } from "@/lib/utils";

const TONES = {
  citron: "bg-citron text-citron-foreground",
  cherry: "bg-primary text-primary-foreground",
  ink: "bg-ink text-citron dark:bg-bone dark:text-ink",
  paper: "bg-surface-raised text-foreground",
};

const SHAPES = {
  pill: "rounded-full px-3 py-1",
  tag: "rounded-md px-2.5 py-1",
  circle: "aspect-square rounded-full p-2 text-center leading-tight",
};

export default function Sticker({
  children,
  tone = "citron",
  rotate = -4,
  shape = "pill",
  as: Comp = "span",
  className,
  style,
  ...props
}) {
  return (
    <Comp
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 border-2 border-black font-mono text-[11px] font-semibold uppercase tracking-[0.08em] shadow-hs-sm",
        "motion-safe:hover:animate-wobble",
        TONES[tone] ?? TONES.citron,
        SHAPES[shape] ?? SHAPES.pill,
        className
      )}
      style={{ transform: `rotate(${rotate}deg)`, "--wobble-base": `${rotate}deg`, ...style }}
      {...props}
    >
      {children}
    </Comp>
  );
}
