import * as React from "react";
import { cva } from "class-variance-authority";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Cube3D, OrbitRings, PaperStack3D } from "@/components/art";
import { cn } from "@/lib/utils";

const cardVariants = cva("relative rounded-card", {
  variants: {
    variant: {
      default: "border border-border bg-surface",
      brutal: "border-2 border-border-strong bg-surface shadow-hs",
      raised: "border-2 border-border-strong bg-surface-raised shadow-hs-lg",
      sunk: "border border-border bg-surface-sunk",
      ink: "border-2 border-border-strong bg-ink text-bone shadow-hs dark:bg-surface-raised dark:text-foreground",
      ghost: "border border-dashed border-border bg-transparent",
    },
    interactive: {
      true:
        "cursor-pointer transition-[translate,box-shadow] duration-150 ease-out hover:[translate:0_-2px] " +
        "motion-reduce:hover:[translate:none]",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "brutal", interactive: true, className: "hover:shadow-hs-lg" },
    { variant: "raised", interactive: true, className: "hover:shadow-hs-xl" },
    { variant: "ink", interactive: true, className: "hover:shadow-hs-lg" },
    { variant: "default", interactive: true, className: "hover:border-border-strong hover:shadow-hs-sm" },
  ],
  defaultVariants: { variant: "default", interactive: false },
});

export const Card = React.forwardRef(({ className, variant, interactive, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
));
Card.displayName = "Card";

export { cardVariants };

export const Panel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-control border border-border bg-surface-sunk p-4", className)}
    {...props}
  />
));
Panel.displayName = "Panel";

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 pb-3 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h2
      className={cn(
        "font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function Eyebrow({ number, children, className, inverse = false, as: Comp = "p" }) {
  return (
    <Comp
      className={cn(
        "eyebrow flex items-center gap-2",
        inverse && "text-bone/70 dark:text-muted-foreground",
        className
      )}
    >
      {number !== undefined && number !== null && (
        <span className={inverse ? "text-citron dark:text-primary" : "text-primary"}>
          {String(number).padStart(2, "0")} /
        </span>
      )}
      <span>{children}</span>
    </Comp>
  );
}

export function Marginalia({ label, children, className }) {
  return (
    <aside className={cn("hairline-t pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground", className)}>
      {label && <p className="eyebrow mb-1.5 text-foreground">{label}</p>}
      {children}
    </aside>
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 " +
    "font-mono text-[10.5px] font-semibold uppercase leading-4 tracking-[0.08em]",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunk text-foreground/80",
        accent: "border-primary/35 bg-primary-soft text-primary",
        success: "border-success/35 bg-success-soft text-success",
        warning: "border-warning/35 bg-warning-soft text-warning",
        danger: "border-destructive/35 bg-destructive-soft text-destructive",
        info: "border-info/35 bg-info-soft text-info",
        citron: "border-black bg-citron text-citron-foreground",
        ink: "border-black bg-ink text-bone dark:bg-bone dark:text-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };

const STATUS_META = {
  queued: { label: "Queued", tone: "neutral", pulse: false },
  uploading: { label: "Uploading", tone: "info", pulse: true },
  parsing: { label: "Reading", tone: "info", pulse: true },
  embedding: { label: "Indexing", tone: "info", pulse: true },
  ready: { label: "Ready", tone: "success", pulse: false },
  failed: { label: "Failed", tone: "danger", pulse: false },
};

const DOT_TONE = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  danger: "bg-destructive",
};

export function StatusIndicator({ status, className }) {
  const meta = STATUS_META[status] ?? STATUS_META.queued;
  return (
    <Badge tone={meta.tone} className={className}>
      <span className="relative flex size-2">
        {meta.pulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
              DOT_TONE[meta.tone]
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", DOT_TONE[meta.tone])} />
      </span>
      {meta.label}
    </Badge>
  );
}

export const StatusBadge = StatusIndicator;

export { STATUS_META };

export function Skeleton({ className }) {
  return (
    <div
      className={cn("shimmer rounded-control border border-border bg-surface-sunk", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonList({ rows = 3, className }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  emphasis,
  eyebrow,
  number,
  description,
  actions,
  marginalia,
  className,
  titleClassName,
  as: Heading = "h1",
}) {
  return (
    <header className={cn("grid grid-cols-1 gap-6 lg:grid-cols-12", className)}>
      <div className={cn("min-w-0", marginalia ? "lg:col-span-8" : "lg:col-span-12")}>
        <div
          className={cn(
            "flex flex-col gap-4",
            marginalia ? "gap-5" : "sm:flex-row sm:items-end sm:justify-between"
          )}
        >
          <div className="min-w-0">
            {(eyebrow || number !== undefined) && (
              <Eyebrow number={number} className="mb-3">
                {eyebrow}
              </Eyebrow>
            )}
            <Heading
              className={cn(
                "display text-[2.25rem] text-foreground sm:text-[2.75rem] lg:text-[3.25rem]",
                titleClassName
              )}
            >
              {title}
              {emphasis && (
                <>
                  {" "}
                  <em className="display-italic text-primary">{emphasis}</em>
                </>
              )}
            </Heading>
            {description && (
              <p className="mt-3 max-w-[62ch] text-base text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2.5">{actions}</div>
          )}
        </div>
      </div>
      {marginalia && (
        <div className="min-w-0 lg:col-span-3 lg:col-start-10">
          {typeof marginalia === "string" ? <Marginalia>{marginalia}</Marginalia> : marginalia}
        </div>
      )}
    </header>
  );
}

const EMPTY_ART = {
  paper: (size) => <PaperStack3D size={size} />,
  cube: (size) => <Cube3D size={size} speed={0.6} />,
  orbit: (size) => <OrbitRings size={size} active={false} />,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  art = "paper",
  artSize = 112,
}) {
  const renderArt = typeof art === "string" ? EMPTY_ART[art] : null;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      {(renderArt || Icon) && (
        <div className="relative mb-5">
          {renderArt ? renderArt(artSize) : null}
          {Icon && (
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-control border-2 border-black bg-citron text-citron-foreground shadow-hs-sm",
                renderArt &&
                  (art === "paper"
                    ? "absolute bottom-[14%] right-[2%] rotate-6"
                    : "absolute -bottom-1 -right-3 rotate-6")
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
          )}
        </div>
      )}
      <p className="font-display text-2xl font-semibold leading-tight tracking-[-0.015em] text-foreground">
        {title}
      </p>
      {description && (
        <p className="mt-2 max-w-[46ch] text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-control border-2 border-destructive bg-destructive-soft px-4 py-3 shadow-hs-sm",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">{title}</p>
          {message && <p className="mt-1 text-sm text-foreground/85">{message}</p>}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, label, className }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2.5 w-full overflow-hidden rounded-full border-[1.5px] border-border-strong bg-surface-sunk"
      >
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ActivityBar({ label, className }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "shimmer h-2.5 w-full overflow-hidden rounded-full border-[1.5px] border-border-strong bg-surface-sunk",
        className
      )}
    />
  );
}

export function Separator({ className, orientation = "horizontal" }) {
  return (
    <div
      role="separator"
      className={cn(
        "bg-border",
        orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        className
      )}
    />
  );
}

export function Kbd({ children, className }) {
  return (
    <kbd
      className={cn(
        "rounded-[5px] border border-b-2 border-border-strong bg-surface-raised px-1.5 py-0.5 " +
          "font-mono text-[10.5px] font-semibold text-foreground/80",
        className
      )}
    >
      {children}
    </kbd>
  );
}
