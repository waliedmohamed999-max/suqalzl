import { Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { SETTING_GROUPS, type AdminSettingsDTO } from "@/features/admin/schema";
import { FormSection } from "../form-section";
import { PageHeader } from "../page-header";

/** Values are shown as stored; amounts/bps stay raw because the key says the unit (e.g. *Bps, *Halalas). */
function display(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

/**
 * /admin/settings (AdminSettings-desktop board), VIEW ONLY in M1: settings grouped as the
 * contract groups them, with a jump nav. Secrets (payment keys etc.) are environment variables and
 * never reach this screen. Editing (with audit before/after) arrives in P3-01.
 */
export function SettingsView({ data }: { data: AdminSettingsDTO }) {
  const t = useTranslations("admin.settings");
  const tn = useTranslations("admin.nav");
  const format = useFormatter();
  const groups = SETTING_GROUPS.map((g) => ({ g, items: data.settings.filter((s) => s.group === g) })).filter(
    (x) => x.items.length,
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={t("title")}
        breadcrumbs={[{ label: tn("root"), href: "/admin" }, { label: tn("settings") }]}
        description={t("description")}
      />
      <Callout tone="secure" title={t("readOnlyTitle")}>
        {t("readOnlyBody")}
      </Callout>
      <div className="flex flex-wrap items-start gap-6">
        <nav
          aria-label={t("nav")}
          className="flex max-w-60 flex-[1_1_12rem] flex-col gap-0.5 lg:sticky lg:top-[calc(var(--banner-h,0px)+1rem)]"
        >
          {groups.map(({ g }) => (
            <a
              key={g}
              href={`#settings-${g}`}
              className="flex min-h-10 items-center rounded-md border-s-[3px] border-transparent px-3 text-sm hover:bg-accent"
            >
              {t(`groups.${g}`)}
            </a>
          ))}
        </nav>
        <div className="min-w-0 flex-[999_1_40rem]">
          {groups.map(({ g, items }) => (
            <FormSection key={g} id={`settings-${g}`} title={t(`groups.${g}`)} description={t(`groupHelp.${g}`)}>
              <dl className="flex flex-col">
                {items.map((s) => (
                  <div
                    key={s.key}
                    className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <dt className="flex flex-wrap items-center gap-2">
                      <code dir="ltr" className="font-sans text-sm font-semibold">
                        {s.key}
                      </code>
                      {s.pendingOwner ? (
                        <Badge tone="warning" size="sm">
                          {t("pendingOwner")}
                        </Badge>
                      ) : null}
                      {s.isPublic ? (
                        <Badge tone="neutral" size="sm" icon={false}>
                          {t("public")}
                        </Badge>
                      ) : (
                        <Lock aria-label={t("private")} className="size-3.5 text-muted-foreground" />
                      )}
                    </dt>
                    {s.description ? <dd className="text-sm text-muted-foreground">{s.description}</dd> : null}
                    <dd>
                      <pre
                        dir="ltr"
                        className="overflow-x-auto rounded-sm bg-muted px-3 py-2 font-sans text-sm whitespace-pre-wrap rtl:text-end"
                      >
                        {display(s.value)}
                      </pre>
                    </dd>
                    {s.updatedAt ? (
                      <dd className="text-xs text-muted-foreground">
                        {t("updated", {
                          date: format.dateTime(new Date(s.updatedAt), { dateStyle: "medium", timeStyle: "short" }),
                          name: s.updatedBy?.name ?? t("system"),
                        })}
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </FormSection>
          ))}
        </div>
      </div>
    </div>
  );
}
