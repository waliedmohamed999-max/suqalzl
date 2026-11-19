"use client";

import { useId, type ChangeEvent, type ComponentProps } from "react";
import { toLatinDigits } from "@/lib/format/digits";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;

export interface OtpInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "maxLength" | "type" | "children"
> {
  value: string;
  onValueChange: (value: string) => void;
  /** Called once the 6th digit is entered (paste and SMS autofill included). */
  onComplete?: (value: string) => void;
  /** Accessible name, e.g. "رمز التحقق من 6 أرقام". */
  label: string;
}

/**
 * InputOTP (D20, README 4.3, implementation-review 3.2): ONE real input with
 * autocomplete="one-time-code" laid over 6 decorative boxes (48×56, input-lg 24px). Separate
 * per-digit inputs break iOS SMS autofill and make screen readers announce "digit 1, digit 2…".
 * Accepts ٠–٩ / ۰–۹ and pasted text with spaces; keeps digits only.
 */
export function OtpInput({ value, onValueChange, onComplete, label, className, id, ...props }: OtpInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const digits = value.slice(0, OTP_LENGTH);
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const next = toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, OTP_LENGTH);
    onValueChange(next);
    if (next.length === OTP_LENGTH && next !== digits) onComplete?.(next);
  }

  return (
    <div className={cn("group relative mx-auto flex w-fit justify-center", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div aria-hidden="true" dir="ltr" className="flex gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const char = digits[i] ?? "";
          const active = i === Math.min(digits.length, OTP_LENGTH - 1);
          return (
            <span
              key={i}
              data-active={active || undefined}
              data-filled={char ? true : undefined}
              className={cn(
                "input-lg inline-flex h-14 w-12 items-center justify-center rounded-md border border-input bg-card text-card-foreground",
                "data-[filled]:border-2 data-[filled]:border-border-strong",
                "group-focus-within:data-[active]:border-2 group-focus-within:data-[active]:border-border-strong group-has-[input:focus-visible]:data-[active]:outline-2 group-has-[input:focus-visible]:data-[active]:outline-offset-2 group-has-[input:focus-visible]:data-[active]:outline-ring",
                invalid && "border-2 border-danger data-[filled]:border-danger",
              )}
            >
              {char}
            </span>
          );
        })}
      </div>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        dir="ltr"
        maxLength={OTP_LENGTH * 2}
        value={digits}
        onChange={handle}
        className="input-lg absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent opacity-0 focus-visible:outline-none"
        {...props}
      />
    </div>
  );
}
