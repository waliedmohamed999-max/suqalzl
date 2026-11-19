import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderDetail } from "@/components/account/order-detail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getMyOrderAction } from "@/features/orders/actions";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea.order" });
  return { title: t("title", { number: decodeURIComponent(number).slice(0, 20) }), robots: { index: false } };
}

/** /account/orders/[number] (AccountOrder-mobile): read only; the customer's own order (rule 8). */
export default async function MyOrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountArea.order");
  const ts = await getTranslations("states");
  const res = await getMyOrderAction({ locale: locale === "en" ? "en" : "ar", number: decodeURIComponent(number) });
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/account/orders"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-link"
      >
        <ChevronLeft aria-hidden="true" data-directional="" className="size-4" />
        {t("back")}
      </Link>
      {res.ok ? (
        <>
          <h1 className="text-2xl font-bold">
            {t.rich("heading", { number: res.data.number, n: (c) => <bdi dir="ltr">{c}</bdi> })}
          </h1>
          <OrderDetail order={res.data} />
        </>
      ) : res.code === "NOT_FOUND" || res.code === "VALIDATION" ? (
        <EmptyState
          title={t("notFoundTitle")}
          body={t("notFoundBody")}
          action={
            <Button asChild>
              <Link href="/account/orders">{t("back")}</Link>
            </Button>
          }
          className="rounded-lg bg-card"
        />
      ) : (
        <ErrorState title={ts("errorTitle")} body={ts("errorBody")} />
      )}
    </div>
  );
}
