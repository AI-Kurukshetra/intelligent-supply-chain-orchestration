import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, _period: PeriodInput): Promise<KpiValue> {
  const rows = await selectRows<{ on_hand_qty: number; unit_cost_cents: number }>(supabase.from("inventory_positions").select("on_hand_qty, unit_cost_cents").eq("tenant_id", tenantId));
  const value = rows.reduce((sum, row) => sum + Number(row.on_hand_qty ?? 0) * Number(row.unit_cost_cents ?? 0), 0);
  return { kpi_code: "KPI_07", kpi_name: "Inventory Value", value: Number(value.toFixed(0)), uom: "cents" };
}
