import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddressBook } from "@/components/account/address-book";
import { ErrorState } from "@/components/ui/error-state";
import { deleteAddressAction, getCheckoutAddressStepAction, saveAddressAction } from "@/features/cart/actions";
import { MAX_ADDRESSES } from "@/features/cart/schema";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea.addresses" });
  return { title: t("title"), robots: { index: false } };
}

/** /account/addresses (AccountAddresses-mobile). Data: the checkout address step (addresses + cities). */
export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale === "en" ? "en" : "ar";
  const t = await getTranslations("accountArea.addresses");
  const ts = await getTranslations("states");
  const res = await getCheckoutAddressStepAction(loc);

  async function save(input: unknown) {
    "use server";
    return saveAddressAction(input, loc);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold lg:text-[28px]">{t("title")}</h1>
      {res.ok ? (
        <AddressBook
          initial={res.data.addresses}
          cities={res.data.cities}
          max={MAX_ADDRESSES}
          save={save}
          remove={deleteAddressAction}
        />
      ) : (
        <ErrorState title={ts("errorTitle")} body={ts("errorBody")} />
      )}
    </div>
  );
}
