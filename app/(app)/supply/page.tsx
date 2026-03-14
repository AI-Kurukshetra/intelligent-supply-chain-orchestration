import { SupplyWorkbench } from "@/components/supply/supply-workbench";
import { getUserContext } from "@/lib/auth/server";
import { listActiveProducts } from "@/lib/demand/service";
import { getPlanningCycle, listPlanningCycles, listPlannedOrders } from "@/lib/supply/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplyWorkbenchPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view supply planning.</section>;
  }

  const context = await getUserContext(user.id);
  const cyclesPage = await listPlanningCycles(context.tenantId, null, 50);
  const cycles = cyclesPage.data;
  const params = (await searchParams) ?? {};
  const cycleId = typeof params.cycle_id === "string" ? params.cycle_id : cycles[0]?.id ?? "";
  const cycleDetail = cycleId ? await getPlanningCycle(context.tenantId, cycleId) : null;
  const ordersPage = cycleId ? await listPlannedOrders({ tenantId: context.tenantId, planningCycleId: cycleId, limit: 500, cursor: null, type: null, status: null, productId: null, facilityId: null, dateFrom: null, dateTo: null }) : { data: [], next_cursor: null, has_more: false };
  const products = await listActiveProducts(context.tenantId);

  return <SupplyWorkbench cycles={cycles} selectedCycle={cycleDetail?.cycle ?? null} orders={ordersPage.data} products={products} />;
}

