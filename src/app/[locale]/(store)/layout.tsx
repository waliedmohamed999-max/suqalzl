import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getStoreShell } from "@/features/shell/queries";

/**
 * Store shell (P1-02): header + categories, main, footer, WhatsApp button. Static-friendly: no
 * cookies/headers read here (implementation-review 2.2); shell data is cached and tagged.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const shell = await getStoreShell(locale);
  return (
    <>
      <PreviewBanner />
      <StoreHeader categories={shell.categories} whatsappNumber={shell.whatsappNumber} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
      <StoreFooter storeInfo={shell.storeInfo} categories={shell.categories} />
      {shell.whatsappNumber ? <WhatsAppFab number={shell.whatsappNumber} /> : null}
    </>
  );
}
