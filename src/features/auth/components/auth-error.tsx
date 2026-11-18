"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { errorMessageKey } from "../client";
import { formatClock, useCountdown } from "./use-countdown";

/** Inline error banner for an API error code, with the rate-limit countdown when retryAt is known. */
export function AuthErrorBanner({
  code,
  retryAt,
  title,
  action,
}: {
  code: string;
  retryAt?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  const te = useTranslations("errors");
  const tc = useTranslations("auth.customer");
  const left = useCountdown(retryAt);
  return (
    <Callout tone={code === "RATE_LIMITED" || code === "OTP_EXPIRED" ? "warning" : "danger"} title={title ?? te(errorMessageKey(code) as never)} action={action}>
      {title ? te(errorMessageKey(code) as never) : null}
      {code === "RATE_LIMITED" && left > 0 ? (
        <p>
          {tc.rich("retryAfter", {
            time: () => (
              <bdi dir="ltr" className="font-semibold">
                {formatClock(left)}
              </bdi>
            ),
          })}
        </p>
      ) : null}
    </Callout>
  );
}
