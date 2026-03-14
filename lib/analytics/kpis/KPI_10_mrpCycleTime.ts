import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ started_at: string | null; completed_at: string | null }>(supabase.from("mrp_runs").select("started_at, completed_at, created_at").eq("tenant_id", tenantId).gte("created_at", period.from).lte("created_at", period.to));
  const durations = rows.filter((row) => row.started_at && row.completed_at).map((row) => (new Date(String(row.completed_at)).getTime() - new Date(String(row.started_at)).getTime()) / 3600000);
  const avg = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  return { kpi_code: "KPI_10", kpi_name: "MRP Cycle Time", value: Number(avg.toFixed(2)), uom: "hours" };
}
