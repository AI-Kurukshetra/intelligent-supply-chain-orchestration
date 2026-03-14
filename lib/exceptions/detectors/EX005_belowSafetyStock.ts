import type { Detector } from "@/lib/exceptions/detectors/shared";

type ProductInfo = { id: string; sku: string; name: string };
type FacilityInfo = { id: string; name: string };

export const detectBelowSafetyStock: Detector = async (supabase, tenantId) => {
  const [positionsResult, productsResult, facilitiesResult] = await Promise.all([
    supabase.from<{ product_id: string; facility_id: string; on_hand_qty: number; safety_stock_qty: number }>("inventory_positions").select("product_id, facility_id, on_hand_qty, safety_stock_qty").eq("tenant_id", tenantId),
    supabase.from<ProductInfo>("products").select("id, sku, name").eq("tenant_id", tenantId),
    supabase.from<FacilityInfo>("facilities").select("id, name").eq("tenant_id", tenantId)
  ]);
  if (positionsResult.error || productsResult.error || facilitiesResult.error) return [];
  const products = new Map<string, ProductInfo>((productsResult.data ?? []).map((row) => [row.id, row]));
  const facilities = new Map<string, FacilityInfo>((facilitiesResult.data ?? []).map((row) => [row.id, row]));
  return (positionsResult.data ?? []).flatMap((row) => {
    if (Number(row.on_hand_qty) >= Number(row.safety_stock_qty)) return [];
    const product = products.get(row.product_id);
    const facility = facilities.get(row.facility_id);
    return [{ exception_type: "EX005_belowSafetyStock", severity: Number(row.on_hand_qty) <= Number(row.safety_stock_qty) * 0.5 ? "high" : "medium", title: "Inventory below safety stock", description: `${product?.sku ?? row.product_id} at ${facility?.name ?? row.facility_id} is below its safety stock policy.`, entity_type: "product", entity_id: row.product_id, entity_name: product?.name ?? product?.sku ?? row.product_id, facility_id: row.facility_id, context_json: { on_hand_qty: Number(row.on_hand_qty), safety_stock_qty: Number(row.safety_stock_qty) } }];
  });
};
