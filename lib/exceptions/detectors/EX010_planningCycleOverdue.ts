import type { Detector } from "@/lib/exceptions/detectors/shared";

export const detectPlanningCycleOverdue: Detector = async (supabase, tenantId) => {
  const result = await supabase.from("planning_cycles").select("id, cycle_name, created_at, status").eq("tenant_id", tenantId);
  if (result.error) return [];
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  return (result.data ?? []).flatMap((cycle: { id: string; cycle_name: string; created_at: string; status: string }) => {
    if (["approved", "locked", "complete"].includes(cycle.status) || new Date(cycle.created_at) >= cutoff) return [];
    return [{
      exception_type: "EX010_planningCycleOverdue",
      severity: "medium",
      title: "Planning cycle overdue",
      description: `${cycle.cycle_name} has been open for more than 7 days without approval or lock.`,
      entity_type: "planning_cycle",
      entity_id: cycle.id,
      entity_name: cycle.cycle_name,
      facility_id: null,
      context_json: { created_at: cycle.created_at, status: cycle.status }
    }];
  });
};
