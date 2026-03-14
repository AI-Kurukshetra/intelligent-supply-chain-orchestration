import { SupplierCapacityPage } from "@/components/collaboration/supplier-portal";
import { getSupplierContext, listCapacitySubmissions } from "@/lib/collaboration/service";
import { createSupabaseServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplierCapacityRoutePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const context = await getSupplierContext(user.id);
  const [submissions, productsResult] = await Promise.all([
    listCapacitySubmissions(context.tenantId, context.supplierId),
    (await createSupabaseServiceClient()).from("products").select("id, sku, name").eq("tenant_id", context.tenantId).order("sku", { ascending: true }).limit(50)
  ]);
  return <SupplierCapacityPage submissions={submissions as Array<Record<string, unknown>>} products={productsResult.data ?? []} />;
}
