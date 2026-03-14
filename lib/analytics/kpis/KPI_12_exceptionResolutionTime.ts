import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ detected_at: string; resolved_at: string | null; status: string }>(supabase.from("exceptions").select("detected_at, resolved_at, status, updated_at").eq("tenant_id", tenantId).eq("status", "resolved").gte("updated_at", period.from).lte("updated_at", period.to));
  const durations = rows.filter((row) => row.resolved_at).map((row) => (new Date(String(row.resolved_at)).getTime() - new Date(String(row.detected_at)).getTime()) / 3600000);
  const avg = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  return { kpi_code: "KPI_12", kpi_name: "Exception Resolution Time", value: Number(avg.toFixed(2)), uom: "hours" };
}
