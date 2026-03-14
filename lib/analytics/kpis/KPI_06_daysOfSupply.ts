import { daysBetween, safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const [positions, demand, products] = await Promise.all([
    selectRows<{ product_id: string; on_hand_qty: number; unit_cost_cents: number }>(supabase.from("inventory_positions").select("product_id, on_hand_qty, unit_cost_cents").eq("tenant_id", tenantId)),
    selectRows<{ product_id: string; actual_qty: number }>(supabase.from("demand_history").select("product_id, actual_qty").eq("tenant_id", tenantId).gte("period_start", period.from).lte("period_end", period.to)),
    selectRows<{ id: string; standard_cost_cents: number }>(supabase.from("products").select("id, standard_cost_cents").eq("tenant_id", tenantId))
  ]);
  const costByProduct = new Map(products.map((product) => [product.id, Number(product.standard_cost_cents ?? 0)]));
  const onHandValue = positions.reduce((sum, row) => sum + Number(row.on_hand_qty ?? 0) * Number(row.unit_cost_cents ?? costByProduct.get(row.product_id) ?? 0), 0);
  const demandValue = demand.reduce((sum, row) => sum + Number(row.actual_qty ?? 0) * Number(costByProduct.get(row.product_id) ?? 0), 0);
  const avgDailyDemandValue = safeDivide(demandValue, daysBetween(period.from, period.to));
  return { kpi_code: "KPI_06", kpi_name: "Days of Supply", value: Number(safeDivide(onHandValue, avgDailyDemandValue).toFixed(2)), uom: "days" };
}
