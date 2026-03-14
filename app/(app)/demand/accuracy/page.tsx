import { DemandAccuracyDashboard } from "@/components/demand/demand-accuracy-dashboard";
import { getUserContext } from "@/lib/auth/server";
import { getAccuracySummary } from "@/lib/demand/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DemandAccuracyPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view forecast accuracy.</section>;
  }

  const context = await getUserContext(user.id);
  const params = (await searchParams) ?? {};
  const facilityId = typeof params.facility_id === "string" ? params.facility_id : null;
  const summary = await getAccuracySummary(context.tenantId, facilityId);

  const series = summary.rows.reduce<Record<string, Array<{ period: string; value: number }>>>((accumulator, row) => {
    const category = String((row.products as { category?: string } | null)?.category ?? "Uncategorized");
    const period = summary.run?.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const current = accumulator[category] ?? [];
    current.push({ period, value: Number(row.mape ?? 0) });
    accumulator[category] = current;
    return accumulator;
  }, {});

  const rows = summary.rows.map((row) => ({
    sku: String((row.products as { sku?: string } | null)?.sku ?? "-"),
    name: String((row.products as { name?: string } | null)?.name ?? "Unknown"),
    category: String((row.products as { category?: string } | null)?.category ?? "Uncategorized"),
    mape: Number(row.mape ?? 0),
    wmape: Number(row.wmape ?? 0),
    bias: Number(row.bias ?? 0)
  }));

  return <DemandAccuracyDashboard overall={summary.overall} series={series} rows={rows} />;
}
