import { daysBetween, safeDivide, selectRows } from "./common";
import type { AnalyticsClient, KpiValue, PeriodInput } from "./common";
export async function calculate(supabase: AnalyticsClient, tenantId: string, period: PeriodInput): Promise<KpiValue> {
  const [issues, positions] = await Promise.all([
    selectRows<{ quantity: number }>(supabase.from("inventory_transactions").select("quantity").eq("tenant_id", tenantId).eq("transaction_type", "issue").gte("transaction_date", period.from).lte("transaction_date", period.to)),
    selectRows<{ on_hand_qty: number }>(supabase.from("inventory_positions").select("on_hand_qty").eq("tenant_id", tenantId))
  ]);
  const issueQty = issues.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const avgOnHand = positions.length ? positions.reduce((sum, row) => sum + Number(row.on_hand_qty ?? 0), 0) / positions.length : 0;
  const turns = safeDivide(issueQty, avgOnHand) * (365 / daysBetween(period.from, period.to));
  return { kpi_code: "KPI_05", kpi_name: "Inventory Turns", value: Number(turns.toFixed(2)), uom: "turns" };
}
