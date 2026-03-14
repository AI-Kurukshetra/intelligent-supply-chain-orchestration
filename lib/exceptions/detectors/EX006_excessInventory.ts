import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string };
type FacilityInfo = { id: string; name: string };

export const detectExcessInventory: Detector = async (supabase, tenantId) => {
  const [positionsResult, historyResult, productsResult, facilitiesResult] = await Promise.all([
    supabase.from<{ product_id: string; facility_id: string; on_hand_qty: number; unit_cost_cents: number }>("inventory_positions").select("product_id, facility_id, on_hand_qty, unit_cost_cents").eq("tenant_id", tenantId),
    supabase.from<{ product_id: string; facility_id: string; actual_qty: number }>("demand_history").select("product_id, facility_id, actual_qty").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(20000),
    supabase.from<ProductInfo>("products").select("id, sku, name").eq("tenant_id", tenantId),
    supabase.from<FacilityInfo>("facilities").select("id, name").eq("tenant_id", tenantId)
  ]);
  if (positionsResult.error || historyResult.error || productsResult.error || facilitiesResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const facilities = new Map<string, FacilityInfo>((facilitiesResult.data ?? []).map((row) => [row.id, row]));
  return (positionsResult.data ?? []).flatMap((row) => {
    const forwardDemand = (historyResult.data ?? []).filter((entry) => entry.product_id === row.product_id && entry.facility_id === row.facility_id).slice(0, 26).reduce((sum, entry) => sum + Number(entry.actual_qty), 0);
    if (Number(row.on_hand_qty) <= forwardDemand) return [];
    const product = products.get(row.product_id);
    const facility = facilities.get(row.facility_id);
    const excess = Number(row.on_hand_qty) - forwardDemand;
    return [{ exception_type: "EX006_excessInventory", severity: excess > Math.max(forwardDemand, 1) * 0.5 ? "medium" : "low", title: "Excess inventory detected", description: `${product?.sku ?? row.product_id} at ${facility?.name ?? row.facility_id} exceeds 26 weeks of forward demand.`, entity_type: "product", entity_id: row.product_id, entity_name: product?.name ?? product?.sku ?? row.product_id, facility_id: row.facility_id, context_json: { on_hand_qty: Number(row.on_hand_qty), forward_demand_qty: Number(forwardDemand.toFixed(2)), excess_value_cents: Math.round(excess * Number(row.unit_cost_cents)) } }];
  });
};
