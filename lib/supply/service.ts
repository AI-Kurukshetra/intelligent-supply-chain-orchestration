import { createElement } from "react";

import { resend } from "@/lib/email/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import {
  BulkFirmOrdersSchema,
  MrpRunSchema,
  PlannedOrderSchema,
  PlannedOrderUpdateSchema,
  PlanningCycleSchema,
  PlanningCycleStatusSchema
} from "@/lib/validation/supply";
import { ProblemDetail } from "@/lib/utils/errors";
import { applyPagination } from "@/lib/utils/pagination";

export type PlanningCycleRow = Database["public"]["Tables"]["planning_cycles"]["Row"];
export type PlannedOrderRow = Database["public"]["Tables"]["planned_orders"]["Row"];
export type MrpRunRow = Database["public"]["Tables"]["mrp_runs"]["Row"];
export type MrpMessageRow = Database["public"]["Tables"]["mrp_messages"]["Row"];

type OrderSummaryRow = Pick<PlannedOrderRow, "order_type" | "status">;

export async function listPlanningCycles(tenantId: string, cursor?: string | null, limit = 50) {
  const supabase = await createSupabaseServiceClient();
  const query = supabase.from("planning_cycles").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  const page = await applyPagination(query, cursor ?? undefined, limit);
  return {
    ...page,
    data: page.data as PlanningCycleRow[]
  };
}

export async function createPlanningCycle(tenantId: string, userId: string, payload: unknown) {
  const parsed = PlanningCycleSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planning_cycles").insert({ ...parsed, tenant_id: tenantId, created_by: userId }).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Planning Cycle Failed", error?.message ?? "Unable to create planning cycle.");
  }
  return data as PlanningCycleRow;
}

export async function getPlanningCycle(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const [{ data: cycle, error: cycleError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase.from("planning_cycles").select("*").eq("tenant_id", tenantId).eq("id", id).single(),
    supabase.from("planned_orders").select("order_type, status").eq("tenant_id", tenantId).eq("planning_cycle_id", id)
  ]);

  if (cycleError || !cycle) {
    throw new ProblemDetail(404, "Not Found", cycleError?.message ?? "Planning cycle not found.");
  }
  if (ordersError) {
    throw new ProblemDetail(500, "Order Summary Failed", ordersError.message);
  }

  const counts = ((orders ?? []) as OrderSummaryRow[]).reduce<Record<string, number>>((accumulator, order) => {
    const key = `${order.order_type}:${order.status}`;
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return { cycle: cycle as PlanningCycleRow, counts };
}

export async function updatePlanningCycleStatus(tenantId: string, id: string, payload: unknown) {
  const parsed = PlanningCycleStatusSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const patch: Record<string, string> = { status: parsed.status };
  if (parsed.status === "approved") {
    patch.approved_at = new Date().toISOString();
  }
  if (parsed.status === "locked") {
    patch.locked_at = new Date().toISOString();
  }
  const { data, error } = await supabase.from("planning_cycles").update(patch).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Cycle Update Failed", error?.message ?? "Unable to update planning cycle status.");
  }
  return data as PlanningCycleRow;
}

export async function listMrpRuns(tenantId: string, planningCycleId?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("mrp_runs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (planningCycleId) {
    query = query.eq("planning_cycle_id", planningCycleId);
  }
  const { data, error } = await query.limit(100);
  if (error) {
    throw new ProblemDetail(500, "MRP Run Query Failed", error.message);
  }
  return (data ?? []) as MrpRunRow[];
}

export async function getMrpRunDetail(tenantId: string, runId: string) {
  const supabase = await createSupabaseServiceClient();
  const [{ data: run, error: runError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from("mrp_runs").select("*").eq("tenant_id", tenantId).eq("id", runId).single(),
    supabase.from("mrp_messages").select("*").eq("tenant_id", tenantId).eq("mrp_run_id", runId).order("created_at", { ascending: false })
  ]);
  if (runError || !run) {
    throw new ProblemDetail(404, "Not Found", runError?.message ?? "MRP run not found.");
  }
  if (messagesError) {
    throw new ProblemDetail(500, "MRP Messages Failed", messagesError.message);
  }
  return { run: run as MrpRunRow, messages: (messages ?? []) as MrpMessageRow[] };
}

export async function createMrpRun(tenantId: string, userId: string, payload: unknown) {
  const parsed = MrpRunSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data: cycle, error: cycleError } = await supabase.from("planning_cycles").select("*").eq("tenant_id", tenantId).eq("id", parsed.planning_cycle_id).single();
  if (cycleError || !cycle) {
    throw new ProblemDetail(404, "Not Found", cycleError?.message ?? "Planning cycle not found.");
  }

  const { data: products, error: productsError } = await supabase.from("products").select("id").eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null);
  if (productsError) {
    throw new ProblemDetail(500, "MRP Product Load Failed", productsError.message);
  }

  const { data, error } = await supabase
    .from("mrp_runs")
    .insert({
      tenant_id: tenantId,
      planning_cycle_id: parsed.planning_cycle_id,
      status: "queued",
      total_products: (products ?? []).length,
      processed_products: 0,
      failed_products: 0,
      triggered_by: userId,
      summary: { created_from_cycle: parsed.planning_cycle_id }
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "MRP Run Failed", error?.message ?? "Unable to create MRP run.");
  }
  return data as MrpRunRow;
}

export async function setMrpRunStatus(runId: string, patch: Partial<MrpRunRow>) {
  const supabase = await createSupabaseServiceClient();
  const { error } = await supabase.from("mrp_runs").update(patch).eq("id", runId);
  if (error) {
    throw new ProblemDetail(500, "MRP Run Update Failed", error.message);
  }
}

export async function persistMrpResult(input: {
  tenantId: string;
  planningCycleId: string;
  mrpRunId: string;
  plannedOrders: Array<{
    tenant_id: string;
    planning_cycle_id: string;
    product_id: string;
    facility_id: string;
    order_type: string;
    status: string;
    quantity: number;
    uom: string;
    planned_start_date: string;
    planned_end_date: string;
    due_date: string;
    supplier_id: string | null;
    firm_planned: boolean;
    pegging: Json;
  }>;
  messages: Array<{ severity: string; message_type: string; title: string; detail: string; product_id?: string | null; facility_id?: string | null; payload?: Record<string, Json> }>;
}) {
  const supabase = await createSupabaseServiceClient();
  if (input.plannedOrders.length > 0) {
    const { error: ordersError } = await supabase.from("planned_orders").upsert(input.plannedOrders, { onConflict: "tenant_id,planning_cycle_id,product_id,facility_id,due_date,order_type" });
    if (ordersError) {
      throw new ProblemDetail(500, "Planned Order Persist Failed", ordersError.message);
    }
  }

  if (input.messages.length > 0) {
    const { error: messageError } = await supabase.from("mrp_messages").insert(
      input.messages.map((message) => ({
        tenant_id: input.tenantId,
        mrp_run_id: input.mrpRunId,
        planning_cycle_id: input.planningCycleId,
        product_id: message.product_id ?? null,
        facility_id: message.facility_id ?? null,
        severity: message.severity,
        message_type: message.message_type,
        title: message.title,
        detail: message.detail,
        payload: message.payload ?? {}
      }))
    );
    if (messageError) {
      throw new ProblemDetail(500, "MRP Message Persist Failed", messageError.message);
    }
  }
}

export async function notifyMrpCompletion(runId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data: run, error: runError } = await supabase.from("mrp_runs").select("*").eq("id", runId).single();
  if (runError || !run) {
    throw new ProblemDetail(404, "Not Found", runError?.message ?? "MRP run not found.");
  }

  const { data: cycle } = await supabase.from("planning_cycles").select("cycle_name").eq("id", run.planning_cycle_id).single();
  const { data: profile } = await supabase.from("profiles").select("email, first_name").eq("id", run.triggered_by ?? "").single();
  if (!profile?.email) {
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "ISCOP <no-reply@iscop.ai>",
    to: profile.email,
    subject: `MRP run ${run.status.replace(/_/g, " ")}`,
    react: createElement("div", null, [
      createElement("h1", { key: "title" }, "Supply planning run finished"),
      createElement("p", { key: "summary" }, `${profile.first_name ?? "Planner"}, MRP for ${cycle?.cycle_name ?? run.planning_cycle_id} finished with status ${run.status}.`),
      createElement("p", { key: "metrics" }, `${run.processed_products} products processed, ${run.failed_products} failed.`)
    ])
  });
}

export async function listPlannedOrders(input: { tenantId: string; planningCycleId?: string | null; type?: string | null; status?: string | null; productId?: string | null; facilityId?: string | null; dateFrom?: string | null; dateTo?: string | null; cursor?: string | null; limit: number }) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("planned_orders").select("*").eq("tenant_id", input.tenantId).order("created_at", { ascending: false });
  if (input.planningCycleId) query = query.eq("planning_cycle_id", input.planningCycleId);
  if (input.type) query = query.eq("order_type", input.type);
  if (input.status) query = query.eq("status", input.status);
  if (input.productId) query = query.eq("product_id", input.productId);
  if (input.facilityId) query = query.eq("facility_id", input.facilityId);
  if (input.dateFrom) query = query.gte("due_date", input.dateFrom);
  if (input.dateTo) query = query.lte("due_date", input.dateTo);
  const page = await applyPagination(query, input.cursor ?? undefined, input.limit);
  return {
    ...page,
    data: page.data as PlannedOrderRow[]
  };
}

export async function createPlannedOrder(tenantId: string, payload: unknown) {
  const parsed = PlannedOrderSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planned_orders").insert({ ...parsed, tenant_id: tenantId }).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Planned Order Create Failed", error?.message ?? "Unable to create planned order.");
  }
  return data as PlannedOrderRow;
}

export async function getPlannedOrder(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planned_orders").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Planned order not found.");
  }
  return data as PlannedOrderRow;
}

export async function updatePlannedOrder(tenantId: string, id: string, payload: unknown) {
  const parsed = PlannedOrderUpdateSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const existing = await getPlannedOrder(tenantId, id);
  if (existing.status !== "planned" || existing.firm_planned) {
    throw new ProblemDetail(409, "Conflict", "Only non-firm planned orders in planned status can be updated.");
  }
  const { data, error } = await supabase.from("planned_orders").update(parsed).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Planned Order Update Failed", error?.message ?? "Unable to update planned order.");
  }
  return data as PlannedOrderRow;
}

export async function firmPlannedOrder(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planned_orders").update({ firm_planned: true, status: "firmed" }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Firm Order Failed", error?.message ?? "Unable to firm planned order.");
  }
  return data as PlannedOrderRow;
}

export async function bulkFirmPlannedOrders(tenantId: string, payload: unknown) {
  const parsed = BulkFirmOrdersSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("planned_orders").update({ firm_planned: true, status: "firmed" }).eq("tenant_id", tenantId).in("id", parsed.ids).select("*");
  if (error) {
    throw new ProblemDetail(500, "Bulk Firm Failed", error.message);
  }
  return (data ?? []) as PlannedOrderRow[];
}
