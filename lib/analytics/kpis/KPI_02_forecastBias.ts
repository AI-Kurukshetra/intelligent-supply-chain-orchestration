import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ bias: number | null }>(supabase.from("forecast_accuracy").select("bias").eq("tenant_id", tenantId).gte("calculated_at", period.from).lte("calculated_at", period.to));
  const values = rows.map((row) => Number(row.bias ?? 0)).filter(Number.isFinite);
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return { kpi_code: "KPI_02", kpi_name: "Forecast Bias", value: Number(avg.toFixed(2)), uom: "%" };
}
