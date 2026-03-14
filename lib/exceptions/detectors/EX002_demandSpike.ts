import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string };

export const detectDemandSpike: Detector = async (supabase, tenantId) => {
  const [forecastsResult, productsResult] = await Promise.all([
    supabase.from<{ product_id: string; forecast_qty: number; period_start: string }>("statistical_forecasts").select("product_id, forecast_qty, period_start").eq("tenant_id", tenantId).order("period_start", { ascending: false }),
    supabase.from<ProductInfo>("products").select("id, sku, name").eq("tenant_id", tenantId)
  ]);
  if (forecastsResult.error || productsResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const grouped = new Map<string, number[]>();
  for (const row of forecastsResult.data ?? []) {
    const bucket = grouped.get(row.product_id) ?? [];
    bucket.push(Number(row.forecast_qty));
    grouped.set(row.product_id, bucket);
  }
  return Array.from(grouped.entries()).flatMap(([productId, values]) => {
    if (values.length < 16) return [];
    const current = values.slice(0, 4).reduce((sum, v) => sum + v, 0) / 4;
    const rolling = values.slice(4, 16).reduce((sum, v) => sum + v, 0) / 12;
    if (rolling <= 0 || current <= rolling * 1.5) return [];
    const product = products.get(productId);
    return [{ exception_type: "EX002_demandSpike", severity: current > rolling * 2 ? "high" : "medium", title: "Demand spike detected", description: `${product?.sku ?? productId} has a current 4-week forecast significantly above its 12-week rolling average.`, entity_type: "product", entity_id: productId, entity_name: product?.name ?? product?.sku ?? productId, facility_id: null, context_json: { current_four_week_avg: Number(current.toFixed(2)), rolling_twelve_week_avg: Number(rolling.toFixed(2)), ratio: Number((current / rolling).toFixed(2)) } }];
  });
};
