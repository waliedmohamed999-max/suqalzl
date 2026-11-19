"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Drawer (README 4.6): side sheet from `end`, 480px, for quick edits without leaving the list.
 * Body scrolls; the footer (cancel / save) stays fixed at the bottom.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="end" title={title} description={description} closeLabel={tc("close")} className="w-[30rem]">
        <div className="flex min-h-full flex-col">
          <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
          {footer ? (
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
