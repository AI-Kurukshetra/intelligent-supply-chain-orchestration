import { safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ status: string; created_at: string; closed_at: string | null }>(supabase.from("planned_orders").select("status, created_at, closed_at").eq("tenant_id", tenantId).gte("created_at", period.from).lte("created_at", period.to));
  const total = rows.length;
  const completed = rows.filter((row) => row.status === "completed").length;
  return { kpi_code: "KPI_09", kpi_name: "Supply Plan Attainment", value: Number((safeDivide(completed, total) * 100).toFixed(2)), uom: "%" };
}
