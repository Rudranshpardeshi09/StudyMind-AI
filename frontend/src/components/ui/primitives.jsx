import * as React from "react";
import { cva } from "class-variance-authority";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-lg border border-border bg-surface", className)}
    {...props}
  />
));
Card.displayName = "Card";

export const Panel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-md bg-surface-sunk p-4", className)}
    {...props}
  />
));
Panel.displayName = "Panel";

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h2 className={cn("text-base font-semibold text-foreground", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        accent: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-destructive-soft text-destructive",
        info: "bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

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
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              DOT_TONE[meta.tone]
            )}
          />
        )}
        <span
          className={cn("relative inline-flex size-2 rounded-full", DOT_TONE[meta.tone])}
        />
      </span>
      {meta.label}
    </Badge>
  );
}

export { STATUS_META };

export function Skeleton({ className }) {
  return (
    <div className={cn("shimmer rounded-md bg-surface-sunk", className)} aria-hidden="true" />
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

export function PageHeader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed " +
          "border-border px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-surface-sunk text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[46ch] text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">{title}</p>
          {message && <p className="mt-1 text-sm text-destructive/90">{message}</p>}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2.5 border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10"
            >
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
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
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
        "shimmer h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk",
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
        "rounded border border-border-strong bg-surface-sunk px-1.5 py-0.5 " +
          "font-sans text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
