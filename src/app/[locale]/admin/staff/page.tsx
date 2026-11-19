import { adminPage } from "@/components/admin/server";
import { Forbidden } from "@/components/admin/states";
import { StaffView } from "@/components/admin/views/staff";
import { listAdminStaff } from "@/features/admin/queries";

export default async function AdminStaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const g = await adminPage(params, "staff");
  if (!g.allowed) return <Forbidden permission={g.permission} />;
  return <StaffView data={await listAdminStaff(g.principal)} />;
}
