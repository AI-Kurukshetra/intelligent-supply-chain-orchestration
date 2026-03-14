import type { Detector } from "@/lib/exceptions/detectors/shared";

export const detectCapacityOverload: Detector = async (supabase, tenantId) => {
  const [ordersResult, facilitiesResult] = await Promise.all([
    supabase.from("planned_orders").select("facility_id, quantity, planned_start_date").eq("tenant_id", tenantId).in("status", ["planned", "firmed", "released"]),
    supabase.from("facilities").select("id, name, attributes").eq("tenant_id", tenantId)
  ]);
  if (ordersResult.error || facilitiesResult.error) return [];
  const byFacilityPeriod = new Map<string, number>();
  for (const order of ordersResult.data ?? []) {
    const period = String((order as { planned_start_date: string }).planned_start_date).slice(0, 10);
    const key = `${(order as { facility_id: string }).facility_id}:${period}`;
    byFacilityPeriod.set(key, (byFacilityPeriod.get(key) ?? 0) + Number((order as { quantity: number }).quantity));
  }
  return (facilitiesResult.data ?? []).flatMap((facility: { id: string; name: string; attributes: { available_capacity?: number } | null }) => {
    const availableCapacity = Number(facility.attributes?.available_capacity ?? 0);
    if (!availableCapacity) return [];
    return Array.from(byFacilityPeriod.entries()).flatMap(([key, qty]) => {
      const [facilityId, period] = key.split(":");
      if (facilityId !== facility.id || qty <= availableCapacity) return [];
      return [{
        exception_type: "EX003_capacityOverload",
        severity: qty > availableCapacity * 1.25 ? "high" : "medium",
        title: "Capacity overload risk",
        description: `${facility.name} is planned above available capacity in ${period}.`,
        entity_type: "facility",
        entity_id: facility.id,
        entity_name: facility.name,
        facility_id: facility.id,
        context_json: { period, planned_qty: Number(qty.toFixed(2)), available_capacity: availableCapacity }
      }];
    });
  });
};
