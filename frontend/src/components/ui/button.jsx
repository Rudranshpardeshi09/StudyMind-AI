import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const brutal =
  "border-2 border-border-strong shadow-hs " +
  "hover:[translate:-1px_-1px] hover:shadow-hs-hover " +
  "active:[translate:3px_3px] active:shadow-hs-press " +
  "disabled:border-muted-foreground/45 disabled:bg-surface-sunk disabled:text-muted-foreground disabled:shadow-none " +
  "aria-disabled:border-muted-foreground/45 aria-disabled:bg-surface-sunk aria-disabled:text-muted-foreground aria-disabled:shadow-none";

const buttonVariants = cva(
  "group/button relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap " +
    "rounded-control font-sans font-semibold tracking-[-0.005em] " +
    "transition-[translate,box-shadow,background-color,color,border-color] [transition-duration:120ms] ease-out " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:[translate:none] " +
    "aria-disabled:pointer-events-none aria-disabled:[translate:none] " +
    "motion-reduce:hover:[translate:none] motion-reduce:active:[translate:none] " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: cn(brutal, "bg-primary text-primary-foreground"),
        primary: cn(brutal, "bg-primary text-primary-foreground"),
        secondary: cn(
          brutal,
          "bg-ink text-bone dark:bg-bone dark:text-ink"
        ),
        outline: cn(brutal, "bg-surface text-foreground hover:bg-surface-raised"),
        citron: cn(brutal, "bg-citron text-citron-foreground"),
        ghost:
          "border-2 border-transparent bg-transparent text-foreground/80 " +
          "hover:[translate:-1px_-1px] hover:border-border-strong hover:bg-surface hover:text-foreground hover:shadow-hs-sm " +
          "active:[translate:1px_1px] active:shadow-none disabled:opacity-45 aria-disabled:opacity-45",
        destructive: cn(brutal, "bg-destructive text-destructive-foreground"),
        link:
          "h-auto px-0 text-primary underline decoration-2 underline-offset-4 hover:decoration-citron disabled:opacity-45 aria-disabled:opacity-45",
      },
      size: {
        sm: "h-9 px-3.5 text-sm [&_svg]:size-3.5",
        default: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-[52px] px-7 text-base [&_svg]:size-[18px]",
        icon: "size-11 [&_svg]:size-[18px]",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      arrow = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
        disabled={props.disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
        {arrow && !loading && (
          <ArrowRight
            className="transition-transform duration-150 ease-out group-hover/button:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
