import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea.wishlist" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * /account/wishlist (AccountWishlist-mobile). The wishlist contract (list + toggle) is not in the
 * M1 backend yet, so the page says so honestly instead of inventing items (rule 7).
 */
export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountArea.wishlist");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold lg:text-[28px]">{t("title")}</h1>
      <EmptyState
        title={t("soonTitle")}
        body={t("soonBody")}
        action={
          <Button asChild>
            <Link href="/products">{t("shop")}</Link>
          </Button>
        }
        className="rounded-lg bg-card"
      />
    </div>
  );
}
