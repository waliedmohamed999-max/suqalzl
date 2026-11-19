import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutAddressStep } from "@/components/store/checkout-address-step";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCheckoutAddressStepAction, quoteShippingAction, saveAddressAction } from "@/features/cart/actions";
import type { AddressInput } from "@/features/cart/schema";
import { Link, redirect } from "@/i18n/navigation";
import { getPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * /checkout step 1 (Checkout-desktop): sign-in required (OTP, then back here with ?next=), the
 * cart must be non-empty and without issues. Payment (step 2) is P2-03: not in M1.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale === "en" ? "en" : "ar";
  if (!(await getPrincipal()))
    redirect({ href: { pathname: "/login", query: { next: loc === "en" ? "/en/checkout" : "/checkout" } }, locale });
  const t = await getTranslations("checkout");
  const ts = await getTranslations("states");
  const tcart = await getTranslations("cart");
  const res = await getCheckoutAddressStepAction(loc);

  async function saveAddress(input: AddressInput) {
    "use server";
    return saveAddressAction(input, loc);
  }

  let body;
  if (!res.ok) body = <ErrorState title={ts("errorTitle")} body={ts("errorBody")} />;
  else if (!res.data.cart.lines.length)
    body = (
      <EmptyState
        title={t("emptyTitle")}
        body={t("emptyBody")}
        action={
          <Button asChild>
            <Link href="/products">{tcart("browse")}</Link>
          </Button>
        }
      />
    );
  else if (res.data.cart.hasIssues)
    body = (
      <EmptyState
        title={t("fixCartTitle")}
        body={t("fixCartBody")}
        action={
          <Button asChild>
            <Link href="/cart">{t("goToCart")}</Link>
          </Button>
        }
      />
    );
  else body = <CheckoutAddressStep step={res.data} saveAddress={saveAddress} quote={quoteShippingAction} />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CheckoutSteps current={1} />
      {body}
    </div>
  );
}
