import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { ProblemDetail } from "@/lib/utils/errors";

export type PlanningSessionRow = {
  id: string;
  tenant_id: string;
  planning_cycle_id: string;
  status: "open" | "locked" | "archived";
  description: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanningCellRow = {
  id: string;
  tenant_id: string;
  session_id: string;
  entity_type: string;
  entity_id: string;
  period_start: string;
  field_name: string;
  current_value: Json;
  original_value: Json;
  locked_by: string | null;
  locked_at: string | null;
  last_modified_by: string | null;
  last_modified_at: string | null;
  version: number;
};

export type ScenarioRow = {
  id: string;
  tenant_id: string;
  planning_cycle_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived" | "promoted";
  branched_from_id: string | null;
  promoted_by: string | null;
  promoted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ScenarioOverrideRow = {
  id: string;
  tenant_id: string;
  scenario_id: string;
  entity_type: string;
  entity_id: string;
  period_start: string;
  field_name: string;
  override_value: Json;
  original_value: Json;
  created_by: string | null;
  created_at: string;
};

export class PlanningConflictError extends Error {
  constructor(public currentVersion: number, public currentValue: Json) {
    super("Cell version mismatch.");
  }
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function listPlanningSessions(tenantId: string, planningCycleId?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("planning_sessions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (planningCycleId) {
    query = query.eq("planning_cycle_id", planningCycleId);
  }
  const { data, error } = await query.limit(100);
  if (error) {
    throw new ProblemDetail(500, "Session Query Failed", error.message);
  }
  return (data ?? []) as PlanningSessionRow[];
}

export async function createPlanningSession(tenantId: string, userId: string, payload: { planning_cycle_id: string; description?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("planning_sessions")
    .insert({ tenant_id: tenantId, planning_cycle_id: payload.planning_cycle_id, description: payload.description ?? null, owner_id: userId, status: "open" })
    .select("*")
    .single();
  if (error || !data) {
    throw new ProblemDetail(500, "Session Create Failed", error?.message ?? "Unable to create planning session.");
  }
  return data as PlanningSessionRow;
}

export async function getPlanningSession(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planning_sessions").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Planning session not found.");
  }
  return data as PlanningSessionRow;
}

export async function updatePlanningSessionStatus(tenantId: string, id: string, status: PlanningSessionRow["status"]) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planning_sessions").update({ status }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Session Update Failed", error?.message ?? "Unable to update session.");
  }
  return data as PlanningSessionRow;
}

export async function listPlanningCells(tenantId: string, sessionId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planning_cells").select("*").eq("tenant_id", tenantId).eq("session_id", sessionId).order("period_start", { ascending: true });
  if (error) {
    throw new ProblemDetail(500, "Cell Query Failed", error.message);
  }
  return (data ?? []) as PlanningCellRow[];
}

export async function upsertPlanningCell(input: {
  tenantId: string;
  sessionId: string;
  userId: string;
  payload: {
    cell_id?: string | null;
    entity_type: string;
    entity_id: string;
    period_start: string;
    field_name: string;
    value: Json;
    original_value?: Json;
    version: number;
    reason?: string | null;
  };
}) {
  const supabase = await createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("planning_cells")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("session_id", input.sessionId)
    .eq("entity_id", input.payload.entity_id)
    .eq("period_start", input.payload.period_start)
    .eq("field_name", input.payload.field_name)
    .maybeSingle();

  if (existingError) {
    throw new ProblemDetail(500, "Cell Lookup Failed", existingError.message);
  }

  if (existing && Number(existing.version) !== Number(input.payload.version)) {
    throw new PlanningConflictError(Number(existing.version), existing.current_value);
  }

  const nextVersion = existing ? Number(existing.version) + 1 : 1;
  const { data, error } = await supabase
    .from("planning_cells")
    .upsert({
      id: existing?.id ?? input.payload.cell_id ?? undefined,
      tenant_id: input.tenantId,
      session_id: input.sessionId,
      entity_type: input.payload.entity_type,
      entity_id: input.payload.entity_id,
      period_start: input.payload.period_start,
      field_name: input.payload.field_name,
      current_value: input.payload.value,
      original_value: existing?.original_value ?? input.payload.original_value ?? input.payload.value,
      locked_by: input.userId,
      locked_at: new Date().toISOString(),
      last_modified_by: input.userId,
      last_modified_at: new Date().toISOString(),
      version: nextVersion
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Cell Update Failed", error?.message ?? "Unable to update planning cell.");
  }

  return data as PlanningCellRow;
}

export async function setCellLock(input: { tenantId: string; sessionId: string; cellId: string; userId: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("planning_cells")
    .update({ locked_by: input.userId, locked_at: input.userId ? new Date().toISOString() : null })
    .eq("tenant_id", input.tenantId)
    .eq("session_id", input.sessionId)
    .eq("id", input.cellId)
    .select("*")
    .single();
  if (error || !data) {
    throw new ProblemDetail(500, "Cell Lock Failed", error?.message ?? "Unable to update cell lock.");
  }
  return data as PlanningCellRow;
}

export async function listScenarios(tenantId: string, planningCycleId?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("scenarios").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (planningCycleId) {
    query = query.eq("planning_cycle_id", planningCycleId);
  }
  const { data, error } = await query.limit(100);
  if (error) {
    throw new ProblemDetail(500, "Scenario Query Failed", error.message);
  }
  return (data ?? []) as ScenarioRow[];
}

export async function createScenario(input: { tenantId: string; userId: string; payload: { planning_cycle_id: string; name: string; description?: string | null; branched_from_id?: string | null } }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("scenarios")
    .insert({ tenant_id: input.tenantId, planning_cycle_id: input.payload.planning_cycle_id, name: input.payload.name, description: input.payload.description ?? null, status: "draft", branched_from_id: input.payload.branched_from_id ?? null, created_by: input.userId })
    .select("*")
    .single();
  if (error || !data) {
    throw new ProblemDetail(500, "Scenario Create Failed", error?.message ?? "Unable to create scenario.");
  }
  return data as ScenarioRow;
}

export async function getScenario(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("scenarios").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Scenario not found.");
  }
  return data as ScenarioRow;
}

async function getScenarioOverrides(tenantId: string, scenarioId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("scenario_overrides").select("*").eq("tenant_id", tenantId).eq("scenario_id", scenarioId).order("created_at", { ascending: false });
  if (error) {
    throw new ProblemDetail(500, "Override Query Failed", error.message);
  }
  return (data ?? []) as ScenarioOverrideRow[];
}

export async function addScenarioOverride(input: { tenantId: string; scenarioId: string; userId: string; payload: { entity_type: string; entity_id: string; period_start: string; field_name: string; override_value: Json; original_value?: Json } }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("scenario_overrides")
    .insert({ tenant_id: input.tenantId, scenario_id: input.scenarioId, entity_type: input.payload.entity_type, entity_id: input.payload.entity_id, period_start: input.payload.period_start, field_name: input.payload.field_name, override_value: input.payload.override_value, original_value: input.payload.original_value ?? null, created_by: input.userId })
    .select("*")
    .single();
  if (error || !data) {
    throw new ProblemDetail(500, "Scenario Override Failed", error?.message ?? "Unable to add scenario override.");
  }
  return data as ScenarioOverrideRow;
}

async function computeScenarioKpis(tenantId: string, scenario: ScenarioRow) {
  const supabase = await createSupabaseServiceClient();
  const [overrides, positions, orders] = await Promise.all([
    getScenarioOverrides(tenantId, scenario.id),
    supabase.from("inventory_positions").select("*").eq("tenant_id", tenantId),
    supabase.from("planned_orders").select("*").eq("tenant_id", tenantId).eq("planning_cycle_id", scenario.planning_cycle_id)
  ]);

  if (positions.error || orders.error) {
    throw new ProblemDetail(500, "Scenario KPI Failed", positions.error?.message ?? orders.error?.message ?? "Unable to compute scenario KPIs.");
  }

  const inventoryValue = ((positions.data ?? []) as Database["public"]["Tables"]["inventory_positions"]["Row"][]).reduce((sum, row) => sum + Number(row.on_hand_qty) * Number(row.unit_cost_cents), 0);
  const plannedOrderCost = ((orders.data ?? []) as Database["public"]["Tables"]["planned_orders"]["Row"][]).reduce((sum, row) => sum + Number(row.quantity) * 10000, 0);
  const overrideDemand = overrides.map((override: ScenarioOverrideRow) => Number(override.override_value ?? 0)).filter((value: number) => Number.isFinite(value));
  const projectedFillRate = Math.max(80, Math.min(99.5, 95 - average(overrideDemand.map((value: number) => value / 100))));

  return {
    total_inventory_value_cents: Math.round(inventoryValue),
    total_planned_order_cost_cents: Math.round(plannedOrderCost),
    projected_fill_rate_pct: Number(projectedFillRate.toFixed(2)),
    override_count: overrides.length
  };
}

export async function getScenarioWithDeltas(tenantId: string, id: string) {
  const scenario = await getScenario(tenantId, id);
  const baseline = (await listScenarios(tenantId, scenario.planning_cycle_id)).find((candidate) => candidate.status === "active") ?? scenario;
  const [scenarioKpis, baselineKpis, overrides] = await Promise.all([computeScenarioKpis(tenantId, scenario), computeScenarioKpis(tenantId, baseline), getScenarioOverrides(tenantId, id)]);

  return {
    scenario,
    overrides,
    kpis: scenarioKpis,
    deltas: {
      total_inventory_value_cents: scenarioKpis.total_inventory_value_cents - baselineKpis.total_inventory_value_cents,
      total_planned_order_cost_cents: scenarioKpis.total_planned_order_cost_cents - baselineKpis.total_planned_order_cost_cents,
      projected_fill_rate_pct: Number((scenarioKpis.projected_fill_rate_pct - baselineKpis.projected_fill_rate_pct).toFixed(2))
    }
  };
}

export async function compareScenarios(tenantId: string, leftScenarioId: string, rightScenarioId: string) {
  const [left, right] = await Promise.all([getScenarioWithDeltas(tenantId, leftScenarioId), getScenarioWithDeltas(tenantId, rightScenarioId)]);
  return {
    left: left.scenario,
    right: right.scenario,
    metrics: [
      { label: "Total Inventory Value", left: left.kpis.total_inventory_value_cents, right: right.kpis.total_inventory_value_cents, delta: right.kpis.total_inventory_value_cents - left.kpis.total_inventory_value_cents },
      { label: "Total Planned Order Cost", left: left.kpis.total_planned_order_cost_cents, right: right.kpis.total_planned_order_cost_cents, delta: right.kpis.total_planned_order_cost_cents - left.kpis.total_planned_order_cost_cents },
      { label: "Projected Fill Rate", left: left.kpis.projected_fill_rate_pct, right: right.kpis.projected_fill_rate_pct, delta: Number((right.kpis.projected_fill_rate_pct - left.kpis.projected_fill_rate_pct).toFixed(2)) }
    ]
  };
}

export async function promoteScenario(tenantId: string, scenarioId: string, userId: string) {
  const supabase = await createSupabaseServiceClient();
  const scenario = await getScenario(tenantId, scenarioId);
  const overrides = await getScenarioOverrides(tenantId, scenarioId);
  let baselineSession = (await listPlanningSessions(tenantId, scenario.planning_cycle_id)).find((session) => session.description === "Baseline Session");
  if (!baselineSession) {
    baselineSession = await createPlanningSession(tenantId, userId, { planning_cycle_id: scenario.planning_cycle_id, description: "Baseline Session" });
  }

  for (const override of overrides) {
    await supabase.from("planning_cells").upsert({
      tenant_id: tenantId,
      session_id: baselineSession.id,
      entity_type: override.entity_type,
      entity_id: override.entity_id,
      period_start: override.period_start,
      field_name: override.field_name,
      current_value: override.override_value,
      original_value: override.original_value,
      locked_by: null,
      locked_at: null,
      last_modified_by: userId,
      last_modified_at: new Date().toISOString(),
      version: 1
    });
  }

  await supabase.from("scenarios").update({ status: "archived" }).eq("tenant_id", tenantId).eq("planning_cycle_id", scenario.planning_cycle_id).eq("status", "active");
  const { data, error } = await supabase.from("scenarios").update({ status: "promoted", promoted_by: userId, promoted_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", scenarioId).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Promote Failed", error?.message ?? "Unable to promote scenario.");
  }
  return data as ScenarioRow;
}

