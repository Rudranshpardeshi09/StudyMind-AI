import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BrandMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-control border-2 border-black bg-primary font-display text-xl font-semibold leading-none text-primary-foreground shadow-hs-sm",
        className
      )}
    >
      <span className="-mt-0.5 italic">S</span>
    </span>
  );
}

export function BrandLink({ className }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-control text-foreground", className)}
    >
      <BrandMark />
      <span className="sr-only flex-col leading-none min-[400px]:not-sr-only min-[400px]:flex">
        <span className="font-display text-lg font-semibold tracking-tight">StudyMind</span>
        <span className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:block">
          Study notebook
        </span>
      </span>
    </Link>
  );
}

export default function PublicHeader({ showGuideLink = true, className }) {
  return (
    <header className={cn("relative z-20 shrink-0 border-b-2 border-border-strong bg-canvas", className)}>
      <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <BrandLink />
        <nav aria-label="Public" className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {showGuideLink && (
            <Link
              to="/tutorial"
              className="hidden min-h-11 items-center px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground underline-offset-4 hover:underline hover:decoration-primary hover:decoration-2 md:inline-flex"
            >
              How it works
            </Link>
          )}
          <Button size="sm" variant="secondary" className="h-11 sm:h-9" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
