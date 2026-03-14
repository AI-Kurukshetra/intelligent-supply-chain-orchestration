import { SupplyMrpDashboard } from "@/components/supply/supply-mrp-dashboard";
import { getUserContext } from "@/lib/auth/server";
import { getMrpRunDetail, listMrpRuns, listPlanningCycles } from "@/lib/supply/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplyMrpPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view MRP runs.</section>;
  }

  const context = await getUserContext(user.id);
  const cycles = (await listPlanningCycles(context.tenantId, null, 50)).data;
  const params = (await searchParams) ?? {};
  const planningCycleId = typeof params.planning_cycle_id === "string" ? params.planning_cycle_id : null;
  const runs = await listMrpRuns(context.tenantId, planningCycleId);
  const runId = typeof params.run_id === "string" ? params.run_id : runs[0]?.id ?? null;
  const detail = runId ? await getMrpRunDetail(context.tenantId, runId) : null;

  return <SupplyMrpDashboard cycles={cycles} runs={runs} selectedRun={detail?.run ?? null} messages={detail?.messages ?? []} />;
}
