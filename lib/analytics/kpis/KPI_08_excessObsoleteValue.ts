import { selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const [positions, demand] = await Promise.all([
    selectRows<{ product_id: string; on_hand_qty: number; unit_cost_cents: number }>(supabase.from("inventory_positions").select("product_id, on_hand_qty, unit_cost_cents").eq("tenant_id", tenantId)),
    selectRows<{ product_id: string; actual_qty: number }>(supabase.from("demand_history").select("product_id, actual_qty").eq("tenant_id", tenantId).gte("period_start", period.from).lte("period_end", period.to))
  ]);
  const demandByProduct = new Map<string, number>();
  demand.forEach((row) => demandByProduct.set(row.product_id, (demandByProduct.get(row.product_id) ?? 0) + Number(row.actual_qty ?? 0)));
  const value = positions.reduce((sum, row) => {
    const weeklyDemand = (demandByProduct.get(row.product_id) ?? 0) / 13;
    const excessQty = Math.max(0, Number(row.on_hand_qty ?? 0) - weeklyDemand * 26);
    return sum + excessQty * Number(row.unit_cost_cents ?? 0);
  }, 0);
  return { kpi_code: "KPI_08", kpi_name: "Excess & Obsolete Value", value: Number(value.toFixed(0)), uom: "cents" };
}
