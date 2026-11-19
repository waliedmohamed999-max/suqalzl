import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/store/logo";
import { StaffLoginForm } from "@/features/auth/components/staff-login-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "auth" });
  return { title: t("staffLoginTitle"), robots: { index: false } };
}

/** Staff & vendor login (board Login-staff-desktop, D31). Arabic only like the dashboards (D29). */
export default async function StaffLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  if (locale !== "ar") redirect(`/staff/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  setRequestLocale(locale);
  return <StaffLoginView next={next} />;
}

function StaffLoginView({ next }: { next: string | null }) {
  const t = useTranslations("auth");
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center bg-muted px-4 py-12 md:px-6">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-border bg-card p-6 md:p-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("staffLoginTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("staff.subtitle")}</p>
        </div>
        <StaffLoginForm next={next} />
        <hr className="border-border" />
        <p className="text-center text-sm text-muted-foreground">
          {t.rich("staff.newVendor", {
            link: (c) => (
              <Link href="/sell" className="font-semibold text-link underline">
                {c}
              </Link>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
