"use client";

import type { ComponentProps, ReactNode } from "react";
import { inputClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Admin-only form helpers the shared ui kit does not have (Select/Switch come from
 * src/components/ui). If the store needs these, they should move to ui in the store track.
 */

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

/** Label + control + hint/error, for plain (non react-hook-form) fields. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="label text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for a control rendered inside <Field>. */
export function fieldAria(id: string, o: { hint?: unknown; error?: unknown; required?: boolean }) {
  return {
    id,
    "aria-invalid": o.error ? true : undefined,
    "aria-required": o.required || undefined,
    "aria-describedby": o.error ? `${id}-error` : o.hint ? `${id}-hint` : undefined,
  } as const;
}
