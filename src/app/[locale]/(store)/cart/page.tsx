import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/store/cart-view";
import { ErrorState } from "@/components/ui/error-state";
import { getCartAction, removeCartLineAction, updateCartLineAction } from "@/features/cart/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** /cart (Cart-mobile, review 3.7): per-user, dynamic; every amount comes from CartDTO. */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  const ts = await getTranslations("states");
  const res = await getCartAction(locale === "en" ? "en" : "ar");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {res.ok ? (
        <CartView initial={res.data} update={updateCartLineAction} remove={removeCartLineAction} />
      ) : (
        <ErrorState title={ts("errorTitle")} body={ts("errorBody")} />
      )}
    </div>
  );
}
