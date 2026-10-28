import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-[5.5rem] sm:text-[6.5rem]",
  md: "text-[6rem] sm:text-[8rem]",
  lg: "text-[7rem] sm:text-[9rem]",
  xl: "text-[5.5rem] md:text-[9rem] lg:text-[11rem]",
  poster: "text-[14rem] sm:text-[20rem] lg:text-[26rem]",
};

export default function BigNumeral({
  value,
  children,
  className,
  outline = false,
  inverse = false,
  size,
  style,
}) {
  const content = value ?? children;
  const text = typeof content === "number" ? String(content).padStart(2, "0") : content;
  const preset = typeof size === "string" ? SIZES[size] : undefined;
  const custom = size !== undefined && !preset ? (typeof size === "number" ? `${size}px` : size) : undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none select-none font-display font-semibold leading-none",
        preset ?? (custom ? null : "text-numeral"),
        inverse ? "text-bone/[0.09] dark:text-foreground/[0.07]" : "text-foreground/[0.06]",
        outline &&
          (inverse
            ? "text-transparent [-webkit-text-stroke:1px_hsl(var(--bone)/0.25)]"
            : "text-transparent [-webkit-text-stroke:1px_hsl(var(--foreground)/0.18)]"),
        className
      )}
      style={{
        fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
        ...(custom ? { fontSize: custom } : null),
        ...style,
      }}
    >
      {text}
    </span>
  );
}
