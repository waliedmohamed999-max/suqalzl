import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Logo, Ornament } from "@/components/store/logo";
import { CustomerLoginForm } from "@/features/auth/components/customer-login-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

/**
 * Customer login (boards Login-mobile / OTP-mobile / Login-desktop). Mobile: dark hero + form;
 * desktop: one card with the hero on `start` and the form on `end`.
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  return <LoginView next={next} />;
}

function LoginView({ next }: { next: string | null }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  return (
    <>
      <header data-surface="inverse-strong" className="flex items-center gap-1 px-2 py-1.5 lg:px-8">
        <Link
          href="/"
          aria-label={tc("back")}
          className="inline-flex size-11 items-center justify-center rounded-md lg:hidden"
        >
          <ChevronLeft aria-hidden="true" data-directional="" className="size-6" />
        </Link>
        <span className="flex-1 text-base font-semibold lg:hidden">{t("loginTitle")}</span>
        <div className="hidden lg:block">
          <Logo />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col lg:items-center lg:justify-center lg:bg-muted lg:px-8 lg:py-14"
      >
        <div className="flex flex-1 flex-col lg:grid lg:w-full lg:max-w-5xl lg:flex-none lg:grid-cols-2 lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-card">
          <div data-surface="inverse" className="flex flex-col items-start gap-3 px-6 py-8 lg:justify-center lg:p-12">
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
            <Ornament />
            <h1 className="text-3xl font-bold lg:text-4xl">
              <span className="lg:hidden">{t("customer.heroTitle")}</span>
              <span className="hidden lg:inline">{t("customer.heroTitleDesktop")}</span>
            </h1>
            <p className="text-base text-muted-foreground">
              <span className="lg:hidden">{t("customer.heroBody")}</span>
              <span className="hidden lg:inline">{t("customer.heroBodyDesktop")}</span>
            </p>
          </div>
          <div className="flex flex-col gap-5 px-4 py-6 lg:justify-center lg:p-12">
            <h2 className="hidden text-2xl font-bold lg:block">{t("customer.formTitle")}</h2>
            <CustomerLoginForm next={next} />
            <hr className="border-border lg:hidden" />
            <Link
              href="/staff/login"
              className="flex min-h-11 items-center justify-center text-sm font-semibold text-link lg:hidden"
            >
              {t("customer.staffLink")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
