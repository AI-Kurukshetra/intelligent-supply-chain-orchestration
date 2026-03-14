import { safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ quantity: number; confirmed_qty: number | null; actual_delivery_date: string | null; due_date: string; closed_at: string | null; status: string }>(supabase.from("planned_orders").select("quantity, confirmed_qty, actual_delivery_date, due_date, closed_at, status").eq("tenant_id", tenantId).eq("status", "completed").gte("closed_at", period.from).lte("closed_at", period.to));
  const total = rows.length;
  const onTime = rows.filter((row) => !!row.actual_delivery_date && row.actual_delivery_date <= row.due_date && Number(row.confirmed_qty ?? 0) >= Number(row.quantity ?? 0)).length;
  return { kpi_code: "KPI_04", kpi_name: "OTIF", value: Number((safeDivide(onTime, total) * 100).toFixed(2)), uom: "%" };
}
