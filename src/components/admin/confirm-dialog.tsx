"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  body: ReactNode;
  /** a clear verb ("حذف المنتج"), never "نعم" */
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  /** final deletes: the confirm button unlocks only when this exact text is typed */
  typedConfirmation?: string;
  /** extra content between the body and the buttons (e.g. "move products to" select) */
  extra?: ReactNode;
}

/**
 * ConfirmDialog (README 4.6, AlertDialog semantics): role="alertdialog", focus starts on Cancel,
 * Esc / Cancel close it, the confirm button shows a spinner while `onConfirm` runs.
 * Built on the shared Dialog (Radix) because @radix-ui/react-alert-dialog is not a dependency.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  destructive = true,
  typedConfirmation,
  extra,
}: ConfirmDialogProps) {
  const t = useTranslations("admin.kit");
  const tc = useTranslations("common");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const typedId = useId();
  const bodyId = useId();
  const locked = typedConfirmation != null && typed.trim() !== typedConfirmation;
  const Icon = destructive ? AlertTriangle : Info;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) setTyped("");
        onOpenChange(o);
      }}
    >
      <DialogContent
        role="alertdialog"
        aria-describedby={bodyId}
        title={title}
        closeLabel={tc("close")}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={
                destructive
                  ? "inline-flex size-10 flex-none items-center justify-center rounded-full bg-danger-subtle text-danger"
                  : "inline-flex size-10 flex-none items-center justify-center rounded-full bg-muted text-foreground-secondary"
              }
            >
              <Icon className="size-5" />
            </span>
            <p id={bodyId} className="pt-2 text-sm text-foreground-secondary">
              {body}
            </p>
          </div>
          {extra}
          {typedConfirmation != null ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={typedId}>{t("typeToConfirm", { text: typedConfirmation })}</Label>
              <Input
                id={typedId}
                dense
                value={typed}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
                aria-describedby={`${typedId}-hint`}
              />
              <p id={`${typedId}-hint`} className="text-xs text-muted-foreground">
                {t("typeToConfirmHint")}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button ref={cancelRef} variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              disabled={locked}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                  setTyped("");
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
