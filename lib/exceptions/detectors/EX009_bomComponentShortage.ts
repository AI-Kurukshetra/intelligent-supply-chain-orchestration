import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string; attributes: { preferred_supplier_id?: string; supplier_id?: string } | null; lead_time_days: number };

export const detectBomComponentShortage: Detector = async (supabase, tenantId) => {
  const [bomLinesResult, productsResult, positionsResult, forecastsResult] = await Promise.all([
    supabase.from<{ component_product_id: string; parent_product_id: string }>("bom_lines").select("component_product_id, parent_product_id").eq("tenant_id", tenantId),
    supabase.from<ProductInfo>("products").select("id, sku, name, attributes, lead_time_days").eq("tenant_id", tenantId),
    supabase.from<{ product_id: string; on_hand_qty: number }>("inventory_positions").select("product_id, on_hand_qty").eq("tenant_id", tenantId),
    supabase.from<{ product_id: string; forecast_qty: number; period_start: string }>("statistical_forecasts").select("product_id, forecast_qty, period_start").eq("tenant_id", tenantId)
  ]);
  if (bomLinesResult.error || productsResult.error || positionsResult.error || forecastsResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const positionMap = new Map<string, number>((positionsResult.data ?? []).map((row) => [row.product_id, Number(row.on_hand_qty)]));
  const now = new Date();
  return (bomLinesResult.data ?? []).flatMap((line) => {
    const component = products.get(line.component_product_id);
    const parent = products.get(line.parent_product_id);
    if (!component) return [];
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + Number(component.lead_time_days ?? 0));
    const demand = (forecastsResult.data ?? []).filter((forecast) => forecast.product_id === line.parent_product_id && new Date(forecast.period_start) <= horizon).reduce((sum, forecast) => sum + Number(forecast.forecast_qty), 0);
    const hasSupplier = Boolean(component.attributes?.preferred_supplier_id || component.attributes?.supplier_id);
    const onHand = Number(positionMap.get(component.id) ?? 0);
    if ((hasSupplier && onHand > 0) || demand <= 0) return [];
    return [{ exception_type: "EX009_bomComponentShortage", severity: "high", title: "BOM component shortage risk", description: `${component.sku} has no active supplier or no inventory while parent demand is imminent.`, entity_type: "product", entity_id: component.id, entity_name: component.name ?? component.sku, facility_id: null, context_json: { parent_product: parent?.sku ?? line.parent_product_id, on_hand_qty: onHand, demand_horizon_qty: Number(demand.toFixed(2)), has_supplier: hasSupplier } }];
  });
};
