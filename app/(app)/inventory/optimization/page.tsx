import { InventoryOptimizationPage } from "@/components/inventory/inventory-optimization-page";
import { getUserContext } from "@/lib/auth/server";
import { listInventoryPolicies } from "@/lib/inventory/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InventoryOptimizationRoute() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view inventory optimization.</section>;
  }

  const context = await getUserContext(user.id);
  const policies = await listInventoryPolicies(context.tenantId);
  return <InventoryOptimizationPage policies={policies} />;
}
