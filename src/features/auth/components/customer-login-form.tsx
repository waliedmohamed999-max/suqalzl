"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormField } from "@/components/ui/form-field";
import { PhoneInput } from "@/components/ui/input";
import { OtpInput, OTP_LENGTH } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toaster";
import { Link } from "@/i18n/navigation";
import { formatSaudiMobile, normalizeSaudiMobile } from "@/lib/phone";
import { errorMessageKey, postJson, postWithChallenge, safeNext } from "../client";
import { AuthErrorBanner } from "./auth-error";

/** Client-side check only (D23 +9665 only); the server normalises and validates again. */
const phoneSchema = z.object({
  phone: z.string().refine((v) => normalizeSaudiMobile(v) !== null, { message: "phoneInvalid" }),
});
type PhoneForm = z.infer<typeof phoneSchema>;

type ApiError = { code: string; retryAt?: string };

/**
 * Customer login (boards Login-mobile, OTP-mobile, Login-desktop, Login-states):
 * phone → POST /api/auth/otp/request → 6-digit code → POST /api/auth/otp/verify (session cookie).
 * Login and sign-up are the same path; the response never says whether the number exists.
 * Inputs are kept on every error. After success: ?next= (same-site only) or /account.
 */
export function CustomerLoginForm({ next }: { next?: string | null }) {
  const t = useTranslations("auth.customer");
  const tOtp = useTranslations("auth.otp");
  const tAuth = useTranslations("auth");
  const te = useTranslations("errors");
  const locale = useLocale() as "ar" | "en";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<number>(300);
  const [sendError, setSendError] = useState<ApiError | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<ApiError | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [solving, setSolving] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  const form = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function requestCode(e164: string): Promise<boolean> {
    const r = await postWithChallenge<{ ok: true; expiresInSeconds: number }>(
      "/api/auth/otp/request",
      { phone: e164, locale },
      setSolving,
    );
    if (r.ok) {
      setExpiresIn(r.data.expiresInSeconds);
      setSendError(null);
      return true;
    }
    if (r.code === "INVALID_PHONE" || r.code === "VALIDATION") {
      form.setError("phone", { message: "phoneInvalid" });
      setStep("phone");
      return false;
    }
    setSendError({ code: r.code, retryAt: r.retryAt });
    return false;
  }

  const onPhone = form.handleSubmit(async ({ phone: raw }) => {
    const e164 = normalizeSaudiMobile(raw)!;
    if (await requestCode(e164)) {
      setPhone(e164);
      setCode("");
      setCodeError(null);
      setStep("code");
      requestAnimationFrame(() => otpRef.current?.focus());
    }
  });

  async function verify(value: string) {
    if (value.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    setCodeError(null);
    const r = await postJson<{ ok: true; isNew: boolean }>("/api/auth/otp/verify", { phone, code: value, locale });
    if (r.ok) {
      const fallback = locale === "en" ? "/en/account" : "/account";
      window.location.assign(safeNext(next) ?? fallback);
      return; // keep the busy state while the next page loads
    }
    setVerifying(false);
    setCodeError({ code: r.code, retryAt: r.retryAt });
    requestAnimationFrame(() => otpRef.current?.focus());
  }

  async function resend() {
    setResending(true);
    const ok = await requestCode(phone);
    setResending(false);
    if (ok) {
      setCode("");
      setCodeError(null);
      toast.success(t("resent"));
      requestAnimationFrame(() => otpRef.current?.focus());
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={onPhone} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="phone"
          label={t("phoneLabel")}
          hint={t("phoneHint")}
          translateError={(k) => t(k as never)}
          render={({ field, a11y }) => <PhoneInput {...field} {...a11y} placeholder="5X XXX XXXX" />}
        />
        {sendError ? (
          <AuthErrorBanner
            code={sendError.code}
            retryAt={sendError.retryAt}
            title={sendError.code === "INTERNAL" ? t("sendFailedTitle") : undefined}
          />
        ) : null}
        <Button type="submit" size="lg" full loading={form.formState.isSubmitting}>
          {t("sendCode")}
        </Button>
        {solving ? (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {tAuth("challengeSolving")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t.rich("consent", {
            terms: (c) => (
              <Link href="/pages/terms" className="text-link underline">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/pages/privacy" className="text-link underline">
                {c}
              </Link>
            ),
          })}
        </p>
      </form>
    );
  }

  const blocking = codeError && ["OTP_EXPIRED", "OTP_LOCKED", "RATE_LIMITED"].includes(codeError.code);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-2xl font-bold">{t("codeTitle")}</h2>
        <p className="text-base text-muted-foreground">
          {t.rich("codeSentTo", { phone: () => <bdi dir="ltr">{formatSaudiMobile(phone)}</bdi> })}
        </p>
        <Button
          variant="link"
          onClick={() => {
            setStep("phone");
            setCodeError(null);
          }}
        >
          {t("changeNumber")}
        </Button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <OtpInput
          ref={otpRef}
          label={tOtp("label")}
          value={code}
          onValueChange={(v) => {
            setCode(v);
            if (codeError?.code === "OTP_INVALID") setCodeError(null);
          }}
          onComplete={(v) => void verify(v)}
          disabled={verifying}
          aria-invalid={codeError?.code === "OTP_INVALID" || undefined}
          aria-describedby={codeError?.code === "OTP_INVALID" ? "otp-error" : "otp-hint"}
        />
        {codeError?.code === "OTP_INVALID" ? (
          <FieldError id="otp-error">{te(errorMessageKey(codeError.code) as never)}</FieldError>
        ) : null}
      </div>
      {codeError && codeError.code !== "OTP_INVALID" ? (
        <AuthErrorBanner
          code={codeError.code}
          retryAt={codeError.retryAt}
          title={
            codeError.code === "OTP_EXPIRED"
              ? t("expiredTitle")
              : codeError.code === "OTP_LOCKED"
                ? t("lockedTitle")
                : undefined
          }
        />
      ) : null}
      {sendError ? <AuthErrorBanner code={sendError.code} retryAt={sendError.retryAt} /> : null}
      {blocking ? null : (
        <Button type="submit" size="lg" full loading={verifying} disabled={code.length !== OTP_LENGTH}>
          {verifying ? t("verifying") : t("verify")}
        </Button>
      )}
      <Button
        variant={blocking ? "primary" : "ghost"}
        size={blocking ? "lg" : "md"}
        full
        onClick={resend}
        loading={resending}
      >
        <RefreshCw aria-hidden="true" />
        {t("resend")}
      </Button>
      <p id="otp-hint" className="text-center text-xs text-muted-foreground">
        {t("codeValidity", { minutes: Math.max(1, Math.round(expiresIn / 60)) })}
      </p>
    </form>
  );
}
