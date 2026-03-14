import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string };

export const detectForecastAccuracyDegradation: Detector = async (supabase, tenantId) => {
  const [accuracyResult, productsResult] = await Promise.all([
    supabase.from<{ product_id: string; mape: number | null; calculated_at: string }>("forecast_accuracy").select("product_id, mape, calculated_at").eq("tenant_id", tenantId).order("calculated_at", { ascending: false }),
    supabase.from<ProductInfo>("products").select("id, sku, name").eq("tenant_id", tenantId)
  ]);
  if (accuracyResult.error || productsResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const grouped = new Map<string, number[]>();
  for (const row of accuracyResult.data ?? []) {
    const bucket = grouped.get(row.product_id) ?? [];
    bucket.push(Number(row.mape ?? 0));
    grouped.set(row.product_id, bucket);
  }
  return Array.from(grouped.entries()).flatMap(([productId, values]) => {
    if (values.length < 8) return [];
    const current = values.slice(0, 4).reduce((sum, v) => sum + v, 0) / 4;
    const prior = values.slice(4, 8).reduce((sum, v) => sum + v, 0) / 4;
    const degradation = current - prior;
    if (degradation <= 10) return [];
    const product = products.get(productId);
    return [{ exception_type: "EX008_forecastAccuracyDegradation", severity: degradation > 20 ? "high" : "medium", title: "Forecast accuracy degradation", description: `${product?.sku ?? productId} forecast accuracy has degraded materially versus the prior period.`, entity_type: "product", entity_id: productId, entity_name: product?.name ?? product?.sku ?? productId, facility_id: null, context_json: { current_mape: Number(current.toFixed(2)), prior_mape: Number(prior.toFixed(2)), degradation_points: Number(degradation.toFixed(2)) } }];
  });
};
