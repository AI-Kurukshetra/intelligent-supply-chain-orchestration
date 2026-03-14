import { SupplierDashboard } from "@/components/collaboration/supplier-portal";
import { getSupplierContext, getSupplierPortalDashboard } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplierDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const context = await getSupplierContext(user.id);
  const metrics = await getSupplierPortalDashboard(context.tenantId, context.supplierId);
  return <SupplierDashboard supplierName={String(context.supplier.name)} metrics={metrics} />;
}
