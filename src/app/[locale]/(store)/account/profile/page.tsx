import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomerLogout } from "@/components/account/customer-logout";
import { Callout } from "@/components/ui/callout";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea.profile" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * /account/profile (AccountProfile-mobile). The profile contract (name/e-mail/language, marketing
 * consent D19, PDPL export/delete) is not in the M1 backend yet: the page shows what exists
 * (sign out) and says the rest is coming, without fake fields.
 */
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountArea.profile");
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold lg:text-[28px]">{t("title")}</h1>
      <Callout tone="info" title={t("soonTitle")}>
        {t("soonBody")}
      </Callout>
      <section aria-labelledby="privacy" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 id="privacy" className="text-base font-bold">
          {t("privacy")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("privacyBody")}</p>
      </section>
      <CustomerLogout />
    </div>
  );
}
