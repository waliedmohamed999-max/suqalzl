"use client";

import type { ChangeEvent, ComponentProps } from "react";
import { toLatinDigits } from "@/lib/format/digits";
import { cn } from "@/lib/utils";

/**
 * Input (tokens.md 11.1): 16px text (no iOS zoom), border-input (sand-500, 4.04:1 on white),
 * error = danger border + aria-invalid, disabled/read-only = muted surface. Height 44 (store),
 * `dense` 40 for dashboards.
 */
export const inputClass =
  "w-full min-w-0 rounded-sm border border-input bg-card px-3 text-base text-card-foreground transition-colors duration-120 placeholder:text-muted-foreground aria-invalid:border-danger aria-invalid:shadow-[0_0_0_1px_var(--danger)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground read-only:bg-muted";

export interface InputProps extends ComponentProps<"input"> {
  dense?: boolean;
  /**
   * numeric: dir=ltr, text-end in RTL, converts ٠–٩ / ۰–۹ to latin digits before the value
   * reaches the form (tokens.md 8.3).
   */
  numeric?: boolean;
}

export function Input({ className, dense, numeric, onChange, dir, ...props }: InputProps) {
  const handle = numeric
    ? (e: ChangeEvent<HTMLInputElement>) => {
        const latin = toLatinDigits(e.target.value);
        if (latin !== e.target.value) e.target.value = latin;
        onChange?.(e);
      }
    : onChange;
  return (
    <input
      data-slot="input"
      dir={dir ?? (numeric ? "ltr" : undefined)}
      className={cn(inputClass, dense ? "h-10" : "h-11", numeric && "rtl:text-end", className)}
      onChange={handle}
      {...props}
    />
  );
}

export interface PhoneInputProps extends Omit<InputProps, "numeric" | "type"> {
  /** Country prefix shown at the start of the field (D23: Saudi mobiles only). */
  prefix?: string;
}

/**
 * Phone field (Login-mobile board): "+966" prefix at the start, the number typed LTR and
 * aligned to the prefix, inputMode tel. Digits are normalised to latin on change.
 */
export function PhoneInput({ className, prefix = "+966", ...props }: PhoneInputProps) {
  return (
    <div
      className={cn(
        "flex h-13 w-full items-stretch overflow-hidden rounded-md border border-input bg-card has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring has-[input[aria-invalid=true]]:border-danger has-[input[aria-invalid=true]]:shadow-[0_0_0_1px_var(--danger)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center border-e border-border bg-muted px-3.5 text-base font-semibold"
      >
        <bdi dir="ltr">{prefix}</bdi>
      </span>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        numeric
        className="h-auto flex-1 rounded-none border-0 bg-transparent focus-visible:outline-none aria-invalid:shadow-none"
        {...props}
      />
    </div>
  );
}
