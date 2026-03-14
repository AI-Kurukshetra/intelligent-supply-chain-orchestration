import { SupplierOrdersPage } from "@/components/collaboration/supplier-portal";
import { getSupplierContext, listSupplierPortalOrders } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplierOrdersRoutePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const context = await getSupplierContext(user.id);
  const orders = await listSupplierPortalOrders(context.tenantId, context.supplierId);
  return <SupplierOrdersPage orders={orders as Array<Record<string, unknown>>} />;
}
