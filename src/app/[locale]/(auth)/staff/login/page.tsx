import { getTranslations, setRequestLocale } from "next-intl/server";

/**
 * Staff & vendor login UI — P1-02 (D31). API: POST /api/auth/staff/login → { requires2fa, area };
 * if requires2fa, show the OTP step (POST /api/auth/staff/2fa/verify { code, rememberDevice }).
 */
export default async function StaffLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("staffLoginTitle")}</h1>;
}
