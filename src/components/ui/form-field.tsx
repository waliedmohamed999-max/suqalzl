"use client";

import { AlertCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/** Props to spread on the control so label, hint and error are wired for assistive tech. */
export interface FieldA11yProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

export interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>;
  name: N;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  /** stacked (default) or inline (dashboards: label beside the control from md). */
  layout?: "stacked" | "inline";
  /** Translates the zod/RHF error message key (the schema stores message keys, not text). */
  translateError?: (message: string) => string;
  className?: string;
  render: (args: {
    field: ControllerRenderProps<T, N>;
    fieldState: ControllerFieldState;
    a11y: FieldA11yProps;
  }) => ReactNode;
}

/**
 * FormField (tokens.md 11.1) over react-hook-form's Controller. The error is rendered inline
 * under the control with role="alert" (forms use mode "onSubmit", so it is announced when the user
 * submits, then updates quietly as they fix it). Required = "*" + aria-required.
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  hint,
  required,
  layout = "stacked",
  translateError,
  className,
  render,
}: FormFieldProps<T, N>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message;
        const text = message ? (translateError ? translateError(message) : message) : null;
        const describedBy = [hint ? hintId : null, text ? errorId : null].filter(Boolean).join(" ") || undefined;
        return (
          <div
            className={cn(
              "flex flex-col gap-1.5",
              layout === "inline" && "md:grid md:grid-cols-[12rem_1fr] md:items-start md:gap-4",
              className,
            )}
          >
            <Label htmlFor={id} className={layout === "inline" ? "md:pt-2.5" : undefined}>
              {label}
              {required ? (
                <span aria-hidden="true" className="text-danger">
                  {" *"}
                </span>
              ) : null}
            </Label>
            <div className="flex flex-col gap-1.5">
              {render({
                field,
                fieldState,
                a11y: {
                  id,
                  "aria-invalid": !!text,
                  "aria-describedby": describedBy,
                  "aria-required": required || undefined,
                },
              })}
              {hint && !text ? (
                <p id={hintId} className="text-xs text-muted-foreground">
                  {hint}
                </p>
              ) : null}
              {text ? <FieldError id={errorId}>{text}</FieldError> : null}
            </div>
          </div>
        );
      }}
    />
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
