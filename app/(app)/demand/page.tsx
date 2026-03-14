import { DemandWorkbench } from "@/components/demand/demand-workbench";
import { getUserContext } from "@/lib/auth/server";
import { buildDemandWorkbench, listFacilities } from "@/lib/demand/service";
import type { Json } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkbenchRow = Record<string, Json> & { id: string; sku: string; name: string; category: string | null };

export default async function DemandWorkbenchPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view demand planning.</section>;
  }

  const context = await getUserContext(user.id);
  const facilities = await listFacilities(context.tenantId);
  const params = (await searchParams) ?? {};
  const facilityId = typeof params.facility_id === "string" ? params.facility_id : facilities[0]?.id ?? "";
  const horizonWeeks = typeof params.horizon_weeks === "string" ? Number(params.horizon_weeks) : 13;
  const workbench = facilityId ? await buildDemandWorkbench({ tenantId: context.tenantId, facilityId, horizonWeeks }) : { periods: [], rows: [], chartSeries: {}, overrides: [], latestRun: null };

  return <DemandWorkbench facilities={facilities} initialFacilityId={facilityId} initialHorizonWeeks={horizonWeeks} periods={workbench.periods} rows={workbench.rows as WorkbenchRow[]} chartSeries={workbench.chartSeries} overrides={workbench.overrides} latestRun={workbench.latestRun} />;
}
