import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, _period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ severity: string; status: string }>(supabase.from("exceptions").select("severity, status").eq("tenant_id", tenantId).in("status", ["open", "acknowledged"]));
  return { kpi_code: "KPI_11", kpi_name: "Open Exception Count", value: rows.length, uom: "count", dimension: { critical: rows.filter((row) => row.severity === "critical").length, high: rows.filter((row) => row.severity === "high").length, medium: rows.filter((row) => row.severity === "medium").length, low: rows.filter((row) => row.severity === "low").length } };
}
