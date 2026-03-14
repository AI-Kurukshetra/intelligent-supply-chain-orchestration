import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string; lead_time_days: number };

export const detectLatePurchaseOrder: Detector = async (supabase, tenantId) => {
  const [ordersResult, productsResult] = await Promise.all([
    supabase.from<{ id: string; product_id: string; facility_id: string; expected_date: string; created_at: string; status: string }>("open_supply_orders").select("id, product_id, facility_id, expected_date, created_at, status").eq("tenant_id", tenantId).in("status", ["open", "partial"]),
    supabase.from<ProductInfo>("products").select("id, sku, name, lead_time_days").eq("tenant_id", tenantId)
  ]);
  if (ordersResult.error || productsResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  return (ordersResult.data ?? []).flatMap((order) => {
    const product = products.get(order.product_id);
    const created = new Date(order.created_at);
    created.setUTCDate(created.getUTCDate() + Number(product?.lead_time_days ?? 0) + 3);
    if (new Date(order.expected_date) <= created) return [];
    return [{ exception_type: "EX004_latePurchaseOrder", severity: "medium", title: "Late purchase order projected", description: `${product?.sku ?? order.product_id} supply is expected later than its lead-time commitment.`, entity_type: "open_supply_order", entity_id: order.id, entity_name: product?.name ?? product?.sku ?? order.id, facility_id: order.facility_id, context_json: { expected_date: order.expected_date, original_lead_time_days: Number(product?.lead_time_days ?? 0) } }];
  });
};
