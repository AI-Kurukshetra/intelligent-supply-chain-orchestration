import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string };
type FacilityInfo = { id: string; name: string };

export const detectSupplyShortage: Detector = async (supabase, tenantId) => {
  const [forecastsResult, positionsResult, supplyResult, productsResult, facilitiesResult] = await Promise.all([
    supabase.from<{ product_id: string; facility_id: string; forecast_qty: number; period_start: string }>("statistical_forecasts").select("product_id, facility_id, forecast_qty, period_start").eq("tenant_id", tenantId),
    supabase.from<{ product_id: string; facility_id: string; on_hand_qty: number; reserved_qty: number }>("inventory_positions").select("product_id, facility_id, on_hand_qty, reserved_qty").eq("tenant_id", tenantId),
    supabase.from<{ product_id: string; facility_id: string; confirmed_qty: number | null; expected_date: string }>("open_supply_orders").select("product_id, facility_id, confirmed_qty, expected_date").eq("tenant_id", tenantId).in("status", ["open", "partial"]),
    supabase.from<ProductInfo>("products").select("id, sku, name").eq("tenant_id", tenantId),
    supabase.from<FacilityInfo>("facilities").select("id, name").eq("tenant_id", tenantId)
  ]);

  if (forecastsResult.error || positionsResult.error || supplyResult.error || productsResult.error || facilitiesResult.error) return [];
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() + 30);
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const facilities = new Map<string, FacilityInfo>((facilitiesResult.data ?? []).map((row) => [row.id, row]));

  return (positionsResult.data ?? []).flatMap((position) => {
    const demand = (forecastsResult.data ?? []).filter((forecast) => forecast.product_id === position.product_id && forecast.facility_id === position.facility_id && new Date(forecast.period_start) <= cutoff).reduce((sum, forecast) => sum + Number(forecast.forecast_qty), 0);
    const confirmedSupply = (supplyResult.data ?? []).filter((order) => order.product_id === position.product_id && order.facility_id === position.facility_id && new Date(order.expected_date) <= cutoff).reduce((sum, order) => sum + Number(order.confirmed_qty ?? 0), 0);
    const available = Number(position.on_hand_qty) - Number(position.reserved_qty) + confirmedSupply;
    const gapQty = demand - available;
    if (gapQty <= 0) return [];
    const product = products.get(position.product_id);
    const facility = facilities.get(position.facility_id);
    return [{ exception_type: "EX001_supplyShortage", severity: gapQty > demand * 0.25 ? "critical" : "high", title: "Projected supply shortage", description: `${product?.sku ?? position.product_id} at ${facility?.name ?? position.facility_id} is short against the next 30 days of demand.`, entity_type: "product", entity_id: position.product_id, entity_name: product?.name ?? product?.sku ?? position.product_id, facility_id: position.facility_id, context_json: { gap_qty: Number(gapQty.toFixed(2)), demand_qty: Number(demand.toFixed(2)), available_qty: Number(available.toFixed(2)) } }];
  });
};
