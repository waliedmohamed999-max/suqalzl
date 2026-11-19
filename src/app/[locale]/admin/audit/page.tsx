import { adminPage, cleanInput, one, toPage, toPer, type SearchParams } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { AUDIT_ENTITIES, AUDIT_PERIODS } from "@/components/admin/list-params";
import { AuditView } from "@/components/admin/views/audit";
import { listAuditLogs, periodBounds } from "@/features/admin/queries";
import { auditLogListInput } from "@/features/admin/schema";

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const g = await adminPage(params, "audit");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  const sp = await searchParams;
  const period = one(sp.period);
  const from = (AUDIT_PERIODS as readonly string[]).includes(period ?? "")
    ? periodBounds(period as (typeof AUDIT_PERIODS)[number]).from.toISOString()
    : undefined;
  const input = cleanInput(auditLogListInput, {
    entity: one(sp.entity),
    entityId: one(sp.entityId),
    from,
    page: toPage(sp.page),
    perPage: toPer(sp.per),
  });
  const list = await listAuditLogs(g.principal, input);
  const entities = [...new Set([...AUDIT_ENTITIES, ...list.items.map((r) => r.entity)])].sort();
  return <AuditView list={list} entities={entities} filtered={!!(input.entity || input.entityId || input.from)} />;
}
