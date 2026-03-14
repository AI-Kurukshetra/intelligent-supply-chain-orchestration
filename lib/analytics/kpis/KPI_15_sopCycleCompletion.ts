import { safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ status: string; created_at: string; completed_at: string | null }>(supabase.from("sop_cycles").select("status, created_at, completed_at").eq("tenant_id", tenantId).gte("created_at", period.from).lte("created_at", period.to));
  const total = rows.length;
  const complete = rows.filter((row) => row.status === "complete").length;
  return { kpi_code: "KPI_15", kpi_name: "S&OP Cycle Completion", value: Number((safeDivide(complete, total) * 100).toFixed(2)), uom: "%" };
}
