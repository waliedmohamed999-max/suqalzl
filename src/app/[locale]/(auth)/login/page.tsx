import { getTranslations, setRequestLocale } from "next-intl/server";

/** Customer phone + OTP login UI — P1-02 (API: POST /api/auth/otp/request, /api/auth/otp/verify). */
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>;
}
