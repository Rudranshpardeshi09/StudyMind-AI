import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toMessage } from "@/services/http";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayClasses =
  "fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0";

const dialogSurface =
  "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 " +
  "overflow-y-auto rounded-card border-2 border-border-strong bg-surface-raised p-6 shadow-hs-lg outline-none " +
  "duration-200 ease-snap data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 " +
  "data-[state=open]:zoom-in-90 data-[state=closed]:zoom-out-95 " +
  "data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:duration-100";

const titleClasses =
  "font-display text-2xl font-semibold leading-tight tracking-[-0.015em] text-foreground";

const closeClasses =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-control border-2 border-transparent " +
  "text-muted-foreground transition-[transform,box-shadow,border-color,color] [transition-duration:120ms] " +
  "hover:-translate-x-px hover:-translate-y-px hover:border-border-strong hover:bg-surface hover:text-foreground hover:shadow-hs-sm " +
  "active:translate-x-px active:translate-y-px active:shadow-none";

export const DialogContent = React.forwardRef(
  ({ className, children, title, description, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClasses} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          dialogSurface + " max-w-lg",
          className
        )}
        {...props}
      >
        {title && (
          <DialogPrimitive.Title className={cn(titleClasses, "pr-10")}>{title}</DialogPrimitive.Title>
        )}
        {description && (
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
        <DialogPrimitive.Close className={cn(closeClasses, "absolute right-3 top-3")} aria-label="Close">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
DialogContent.displayName = "DialogContent";

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SIDE_CLASSES = {
  left:
    "inset-y-0 left-0 h-full w-[85vw] max-w-sm border-r-2 shadow-hs-lg " +
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  right:
    "inset-y-0 right-0 h-full w-[85vw] max-w-sm border-l-2 shadow-hs-sheet " +
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[85vh] rounded-t-hero border-x-2 border-t-2 shadow-hs-up " +
    "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
};

export const SheetContent = React.forwardRef(
  ({ className, children, side = "bottom", title, description, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClasses} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col border-border-strong bg-surface-raised outline-none " +
            "duration-300 ease-snap data-[state=open]:animate-in data-[state=closed]:animate-out " +
            "data-[state=closed]:duration-150",
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-border-strong px-4 py-3">
          <div className="min-w-0">
            <DialogPrimitive.Title className="font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="eyebrow mt-1">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {title}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className={closeClasses} aria-label="Close">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
SheetContent.displayName = "SheetContent";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  destructive = true,
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const busy = loading || pending;

  React.useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (busy) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm?.();
    } catch (confirmError) {
      setError(toMessage(confirmError));
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange?.(next);
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClasses} />
        <AlertDialogPrimitive.Content
          className={dialogSurface + " max-w-md"}
        >
          <AlertDialogPrimitive.Title className={titleClasses}>
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-control border-2 border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={cn(
                buttonVariants({ variant: destructive ? "destructive" : "default" })
              )}
              onClick={(event) => {
                event.preventDefault();
                confirm();
              }}
              disabled={busy}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
