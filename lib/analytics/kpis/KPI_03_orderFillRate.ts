import { safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ quantity: number; confirmed_qty: number | null; status: string; closed_at: string | null }>(supabase.from("planned_orders").select("quantity, confirmed_qty, status, closed_at").eq("tenant_id", tenantId).eq("status", "completed").gte("closed_at", period.from).lte("closed_at", period.to));
  const total = rows.length;
  const filled = rows.filter((row) => Number(row.confirmed_qty ?? 0) >= Number(row.quantity ?? 0)).length;
  return { kpi_code: "KPI_03", kpi_name: "Order Fill Rate", value: Number((safeDivide(filled, total) * 100).toFixed(2)), uom: "%" };
}
