import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DiscountBadge, Price } from "@/components/store/price";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { StatusBadge } from "@/components/status/status-badge";
import { STATUS_MAP } from "@/components/status/status-map";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormDemo, OtpDemo, OverlayDemo, TableDemo } from "@/dev/catalogue-client";
import { orderRowSchema, priceSampleSchema } from "@/dev/fixtures";
import { sample, samples } from "@/dev/zod-sample";

/**
 * Development-only component catalogue (P1-02, D30). This file only exists as a route when
 * NODE_ENV !== "production" (pageExtensions "dev.tsx" in next.config.ts); the guard below is a
 * second lock. Data is generated from Zod schemas, never shipped to production pages.
 */
export const dynamic = "force-dynamic";

const TONES: Tone[] = ["neutral", "info", "accent", "warning", "success", "danger", "live"];

export default async function ComponentsCatalogue({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const price = sample(priceSampleSchema, 7);
  const rows = samples(orderRowSchema, 5, 11);

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 md:px-8">
      <h1 dir="ltr" className="text-3xl font-bold rtl:text-end">
        /dev/components
      </h1>

      <Section name="Button">
        <div className="flex flex-wrap items-center gap-3">
          {(["primary", "gold", "secondary", "outline", "ghost", "bargain", "destructive", "link"] as const).map(
            (v) => (
              <Button key={v} variant={v}>
                {t("auth.customer.sendCode")}
              </Button>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">{t("auth.staff.submit")}</Button>
          <Button size="md">{t("auth.staff.submit")}</Button>
          <Button size="dense">{t("auth.staff.submit")}</Button>
          <Button disabled>{t("auth.staff.submit")}</Button>
          <Button loading>{t("auth.staff.submit")}</Button>
        </div>
        <div data-surface="inverse" className="flex flex-wrap gap-3 rounded-md p-4">
          <Button>{t("auth.staff.submit")}</Button>
          <Button variant="outline">{t("auth.staff.submit")}</Button>
          <Button variant="bargain">{t("auth.staff.submit")}</Button>
        </div>
      </Section>

      <Section name="Input / PhoneInput / FormField / Checkbox">
        <div className="grid max-w-md gap-3">
          <Input placeholder={t("store.search.placeholder")} aria-label={t("store.search.label")} />
          <Input aria-label={t("store.search.label")} aria-invalid defaultValue="x" />
          <Input aria-label={t("store.search.label")} disabled defaultValue={t("common.loading")} />
          <Input aria-label={t("store.search.label")} numeric inputMode="numeric" defaultValue="١٢٣" />
        </div>
        <FormDemo />
      </Section>

      <Section name="OtpInput">
        <OtpDemo />
      </Section>

      <Section name="Price / DiscountBadge">
        <div className="flex flex-wrap items-center gap-6">
          <Price halalas={price.halalas} size="sm" />
          <Price halalas={price.halalas} />
          <Price halalas={price.halalas} size="lg" compareAt={price.compareAt} />
          <DiscountBadge percent={22} />
          <Price halalas={price.halalas} variant="range" />
          <Price halalas={price.halalas} variant="locked" />
          <Price halalas={0} variant="free" />
          <Price halalas={-15000} />
          <Price halalas={48620000} variant="compact" size="lg" />
        </div>
        <div data-surface="inverse" className="flex gap-6 rounded-md p-4">
          <Price halalas={price.halalas} size="lg" compareAt={price.compareAt} />
        </div>
      </Section>

      <Section name="Badge / StatusBadge">
        {(["subtle", "solid", "outline"] as const).map((v) => (
          <div key={v} className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} variant={v}>
                {tone}
              </Badge>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_MAP.subOrder) as (keyof typeof STATUS_MAP.subOrder)[]).map((s) => (
            <StatusBadge key={s} entity="subOrder" status={s} />
          ))}
        </div>
        <div data-surface="inverse" className="flex flex-wrap gap-2 rounded-md p-4">
          {(Object.keys(STATUS_MAP.deal) as (keyof typeof STATUS_MAP.deal)[]).map((s) => (
            <StatusBadge key={s} entity="deal" status={s} />
          ))}
        </div>
      </Section>

      <Section name="Card / Callout">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.customer.formTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t("auth.customer.heroBody")}</CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {(["info", "success", "warning", "danger", "secure"] as const).map((tone) => (
            <Callout key={tone} tone={tone} title={t("auth.customer.expiredTitle")}>
              {t("auth.customer.expiredBody")}
            </Callout>
          ))}
        </div>
      </Section>

      <Section name="Skeleton">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy="true">
          <Skeleton shape="image" />
          <div className="flex flex-col gap-2">
            <Skeleton />
            <Skeleton className="w-2/3" />
          </div>
          <Skeleton shape="kpi" />
          <Skeleton shape="row" />
        </div>
      </Section>

      <Section name="EmptyState / ErrorState">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState variant="search" title={t("table.empty")} action={<Button>{t("common.retry")}</Button>} />
          </Card>
          {(["inline", "offline", "expired"] as const).map((v) => (
            <Card key={v}>
              <ErrorState
                variant={v}
                title={t(
                  v === "offline"
                    ? "states.offlineTitle"
                    : v === "expired"
                      ? "states.expiredTitle"
                      : "states.errorTitle",
                )}
                body={t(
                  v === "offline" ? "states.offlineBody" : v === "expired" ? "states.expiredBody" : "states.errorBody",
                )}
                action={<Button variant="outline">{t("common.retry")}</Button>}
              />
            </Card>
          ))}
        </div>
      </Section>

      <Section name="Dialog / Sheet / Toast">
        <OverlayDemo />
      </Section>

      <Section name="DataTable">
        <TableDemo rows={rows} />
      </Section>

      <Section name="WhatsAppFab">
        <p className="text-sm text-muted-foreground">{t("store.whatsappFab")}</p>
        <WhatsAppFab number="+966500000000" />
      </Section>
    </main>
  );
}

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 dir="ltr" className="border-b border-border pb-2 text-xl font-semibold rtl:text-end">
        {name}
      </h2>
      {children}
    </section>
  );
}
