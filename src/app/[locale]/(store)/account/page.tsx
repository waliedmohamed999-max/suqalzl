import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrdersView, pageParam } from "./orders-view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea" });
  return { title: t("title"), robots: { index: false } };
}

/** /account = "طلباتي" (Account-desktop opens on the orders list). */
export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrdersView locale={locale} page={pageParam((await searchParams).page)} path="/account" />;
}
