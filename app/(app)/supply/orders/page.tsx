import { SupplyOrdersTable } from "@/components/supply/supply-orders-table";
import { getUserContext } from "@/lib/auth/server";
import { listActiveProducts } from "@/lib/demand/service";
import { listPlannedOrders } from "@/lib/supply/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplyOrdersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view planned orders.</section>;
  }

  const context = await getUserContext(user.id);
  const params = (await searchParams) ?? {};
  const orders = await listPlannedOrders({
    tenantId: context.tenantId,
    planningCycleId: typeof params.planning_cycle_id === "string" ? params.planning_cycle_id : null,
    type: typeof params.type === "string" ? params.type : null,
    status: typeof params.status === "string" ? params.status : null,
    productId: typeof params.product_id === "string" ? params.product_id : null,
    facilityId: typeof params.facility_id === "string" ? params.facility_id : null,
    dateFrom: typeof params.date_from === "string" ? params.date_from : null,
    dateTo: typeof params.date_to === "string" ? params.date_to : null,
    cursor: null,
    limit: 500
  });
  const products = await listActiveProducts(context.tenantId);

  return <SupplyOrdersTable orders={orders.data} products={products} />;
}
