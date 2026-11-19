"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { OtpInput, OTP_LENGTH } from "@/components/ui/otp-input";
import { errorMessageKey, fetchSession, postJson, postWithChallenge, safeNext } from "../client";
import { AuthErrorBanner } from "./auth-error";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ message: "emailInvalid" })),
  password: z.string().min(1, { message: "passwordRequired" }),
});
type LoginForm = z.infer<typeof loginSchema>;
type Area = "admin" | "vendor";
type ApiError = { code: string; retryAt?: string };

function destination(area: Area, next?: string | null) {
  return safeNext(next, [`/${area}`]) ?? `/${area}`;
}

/**
 * Staff & vendor login (board Login-staff-desktop, D31):
 * e-mail + password → POST /api/auth/staff/login → { requires2fa, area }.
 * The 2FA step (6-digit code to the registered mobile + "remember this device for 30 days") is shown
 * ONLY when the server answers requires2fa = true (staffTwoFactorEnabled, off by default), or when the
 * page is reloaded while a 2FA-pending session exists. Credential errors never say which field is wrong.
 */
export function StaffLoginForm({ next }: { next?: string | null }) {
  const t = useTranslations("auth.staff");
  const tAuth = useTranslations("auth");
  const [solving, setSolving] = useState(false);
  const [step, setStep] = useState<"password" | "2fa">("password");
  const [error, setError] = useState<ApiError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // A reload in the middle of 2FA keeps the PENDING session cookie: resume at the code step.
  useEffect(() => {
    let alive = true;
    fetchSession().then((s) => {
      if (alive && s?.requires2fa) setStep("2fa");
    });
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const r = await postWithChallenge<{ ok: true; requires2fa: boolean; area: Area }>(
      "/api/auth/staff/login",
      values,
      setSolving,
    );
    if (!r.ok) {
      setError({ code: r.code, retryAt: r.retryAt });
      return;
    }
    if (r.data.requires2fa) {
      setStep("2fa");
      return;
    }
    window.location.assign(destination(r.data.area, next));
    await new Promise(() => {}); // keep the button busy while the dashboard loads
  });

  if (step === "2fa")
    return (
      <TwoFactorStep
        next={next}
        onRestart={() => {
          form.resetField("password");
          setError(null);
          setStep("password");
        }}
      />
    );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="email"
        label={t("emailLabel")}
        translateError={(k) => t(k as never)}
        render={({ field, a11y }) => (
          <Input
            {...field}
            {...a11y}
            type="email"
            autoComplete="username"
            inputMode="email"
            dir="ltr"
            className="rtl:text-end"
          />
        )}
      />
      <FormField
        control={form.control}
        name="password"
        label={t("passwordLabel")}
        translateError={(k) => t(k as never)}
        render={({ field, a11y }) => (
          <div className="relative">
            <Input
              {...field}
              {...a11y}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              dir="ltr"
              className="pe-12 rtl:text-end"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              className="absolute end-0 top-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        )}
      />
      {error ? <AuthErrorBanner code={error.code} retryAt={error.retryAt} /> : null}
      <Button type="submit" size="lg" full loading={form.formState.isSubmitting}>
        {t("submit")}
      </Button>
      {solving ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {tAuth("challengeSolving")}
        </p>
      ) : null}
    </form>
  );
}

function TwoFactorStep({ next, onRestart }: { next?: string | null; onRestart: () => void }) {
  const t = useTranslations("auth.staff");
  const tOtp = useTranslations("auth.otp");
  const te = useTranslations("errors");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    otpRef.current?.focus();
  }, []);

  async function verify(value: string) {
    if (value.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const r = await postJson<{ ok: true; area: Area }>("/api/auth/staff/2fa/verify", {
      code: value,
      rememberDevice: remember,
    });
    if (r.ok) {
      window.location.assign(destination(r.data.area, next));
      return;
    }
    setBusy(false);
    setError({ code: r.code, retryAt: r.retryAt });
  }

  // The pending session (10 min) is gone or the code can no longer be used: only a new password login sends a new code.
  const dead = error && ["OTP_EXPIRED", "OTP_LOCKED", "TWO_FACTOR_REQUIRED"].includes(error.code);

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
    >
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-xl font-bold">{t("twoFactorTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("twoFactorBody")}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <OtpInput
          ref={otpRef}
          label={tOtp("label")}
          value={code}
          onValueChange={(v) => {
            setCode(v);
            if (error?.code === "OTP_INVALID") setError(null);
          }}
          onComplete={(v) => void verify(v)}
          disabled={busy || !!dead}
          aria-invalid={error?.code === "OTP_INVALID" || undefined}
          aria-describedby={error?.code === "OTP_INVALID" ? "staff-otp-error" : undefined}
        />
        {error?.code === "OTP_INVALID" ? (
          <FieldError id="staff-otp-error">{te(errorMessageKey(error.code) as never)}</FieldError>
        ) : null}
      </div>
      <Checkbox
        id="remember-device"
        checked={remember}
        onCheckedChange={(v) => setRemember(v === true)}
        label={t("rememberDevice")}
        hint={t("rememberDeviceHint")}
        disabled={busy}
      />
      {error && error.code !== "OTP_INVALID" ? <AuthErrorBanner code={error.code} retryAt={error.retryAt} /> : null}
      {dead ? (
        <>
          <p className="text-sm text-muted-foreground">{t("twoFactorExpiredBody")}</p>
          <Button size="lg" full onClick={onRestart}>
            {t("restart")}
          </Button>
        </>
      ) : (
        <>
          <Button type="submit" size="lg" full loading={busy} disabled={code.length !== OTP_LENGTH}>
            {busy ? t("verifying") : t("verify")}
          </Button>
          <Button variant="ghost" full onClick={onRestart}>
            {t("restart")}
          </Button>
        </>
      )}
    </form>
  );
}
