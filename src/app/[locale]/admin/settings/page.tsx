import { adminPage } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { SettingsView } from "@/components/admin/views/settings";
import { getAdminSettings } from "@/features/admin/queries";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const g = await adminPage(params, "settings");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  return <SettingsView data={await getAdminSettings(g.principal)} />;
}
