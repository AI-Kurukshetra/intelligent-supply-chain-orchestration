import type { Detector } from "@/lib/exceptions/detectors/shared";

export const detectSupplierOtifBreach: Detector = async (supabase, tenantId) => {
  const [suppliersResult, ordersResult] = await Promise.all([
    supabase.from("suppliers").select("id, name, attributes").eq("tenant_id", tenantId),
    supabase.from("open_supply_orders").select("id, product_id, status, expected_date, updated_at, source_system").eq("tenant_id", tenantId).eq("status", "closed")
  ]);
  if (suppliersResult.error || ordersResult.error) return [];
  return (suppliersResult.data ?? []).flatMap((supplier: { id: string; name: string; attributes: { otif_threshold?: number } | null }) => {
    const supplierOrders = (ordersResult.data ?? []).filter((order: { source_system?: string | null }) => (order.source_system ?? "") === supplier.id);
    if (supplierOrders.length === 0) return [];
    const onTime = supplierOrders.filter((order: { expected_date: string; updated_at: string }) => new Date(order.updated_at) <= new Date(order.expected_date)).length;
    const otif = (onTime / supplierOrders.length) * 100;
    const threshold = Number(supplier.attributes?.otif_threshold ?? 90);
    if (otif >= threshold) return [];
    return [{
      exception_type: "EX007_supplierOtifBreach",
      severity: otif < threshold - 10 ? "high" : "medium",
      title: "Supplier OTIF breach",
      description: `${supplier.name} is below the configured OTIF threshold over the last 30 days.`,
      entity_type: "supplier",
      entity_id: supplier.id,
      entity_name: supplier.name,
      facility_id: null,
      context_json: { otif_pct: Number(otif.toFixed(2)), threshold_pct: threshold, closed_orders: supplierOrders.length }
    }];
  });
};
