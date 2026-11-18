"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dialog / Sheet (tokens.md 11.1) on Radix Dialog: focus trap, aria-modal, Esc closes, focus
 * returns to the trigger. Scrim 55%, shadow-lg, 320ms in / faster out, transform+opacity only.
 *  - dialog: centred (md and up)
 *  - bottom: bottom sheet (mobile), top corners rounded-lg
 *  - start / end: side sheets (mobile menu from `start`, dashboard panels from `end`)
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const contentVariants = cva(
  "fixed z-[var(--z-overlay)] flex flex-col bg-background text-foreground shadow-lg duration-320 ease-standard data-[state=closed]:animate-out data-[state=closed]:ease-exit data-[state=open]:animate-in focus-visible:outline-none",
  {
    variants: {
      side: {
        dialog:
          "inset-x-0 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-y-1/2 rounded-lg data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        bottom:
          "inset-x-0 bottom-0 max-h-[calc(100dvh-4rem)] rounded-t-lg pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        start:
          "inset-y-0 start-0 h-dvh w-84 max-w-[calc(100%-3rem)] data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start",
        end: "inset-y-0 end-0 h-dvh w-96 max-w-[calc(100%-3rem)] data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end",
      },
    },
    defaultVariants: { side: "dialog" },
  },
);

export interface DialogContentProps
  extends Omit<ComponentProps<typeof DialogPrimitive.Content>, "title">,
    VariantProps<typeof contentVariants> {
  /** Accessible name (rendered as the visible title). */
  title: ReactNode;
  /** Visible description, or sr-only when `hideDescription`. */
  description?: ReactNode;
  closeLabel: string;
  hideTitle?: boolean;
  /** Extra header content (e.g. the logo in the mobile menu). */
  headerStart?: ReactNode;
}

export function DialogContent({
  side,
  title,
  description,
  closeLabel,
  hideTitle,
  headerStart,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] duration-320 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(contentVariants({ side }), className)}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border py-2 ps-4 pe-2">
          {headerStart}
          <DialogPrimitive.Title className={cn("text-lg font-semibold", hideTitle && "sr-only")}>
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="ms-auto inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent"
          >
            <X aria-hidden="true" className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {description ? (
          <DialogPrimitive.Description className="px-4 pt-3 text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
