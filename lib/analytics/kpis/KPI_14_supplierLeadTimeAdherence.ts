import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ lead_time_adherence_pct: number }>(supabase.from("supplier_scorecards").select("lead_time_adherence_pct").eq("tenant_id", tenantId).gte("created_at", period.from).lte("created_at", period.to));
  const avg = rows.length ? rows.reduce((sum, row) => sum + Number(row.lead_time_adherence_pct ?? 0), 0) / rows.length : 0;
  return { kpi_code: "KPI_14", kpi_name: "Supplier Lead Time Adherence", value: Number(avg.toFixed(2)), uom: "%" };
}
