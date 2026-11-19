import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrdersView, pageParam } from "../orders-view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea.orders" });
  return { title: t("title"), robots: { index: false } };
}

export default async function MyOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrdersView locale={locale} page={pageParam((await searchParams).page)} path="/account/orders" />;
}
