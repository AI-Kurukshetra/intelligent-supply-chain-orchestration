import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createElement } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProblemDetail } from "@/lib/utils/errors";

type SupplierProfile = {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  attributes: { supplier_id?: string } | null;
};

type SupplierScorecard = {
  id: string;
  supplier_id: string;
  score_month: number;
  score_year: number;
  otif_pct: number;
  lead_time_adherence_pct: number;
  defect_rate_pct: number;
  composite_score: number;
  grade: string;
};

const sopSteps = [
  "statistical_forecast",
  "demand_review",
  "supply_review",
  "financial_reconciliation",
  "executive_review",
  "complete"
] as const;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#0f172a" },
  title: { fontSize: 20, marginBottom: 12 },
  section: { marginBottom: 16 },
  heading: { fontSize: 14, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  text: { marginBottom: 4 }
});

export async function getSupplierContext(userId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Supplier profile not found.");
  }
  const profile = data as SupplierProfile;
  const supplierId = profile.attributes?.supplier_id;
  if (!supplierId) {
    throw new ProblemDetail(403, "Forbidden", "Supplier account is missing supplier linkage.");
  }
  const { data: supplier, error: supplierError } = await supabase.from("suppliers").select("*").eq("tenant_id", profile.tenant_id).eq("id", supplierId).single();
  if (supplierError || !supplier) {
    throw new ProblemDetail(404, "Not Found", supplierError?.message ?? "Supplier not found.");
  }
  return { profile, supplier, supplierId, tenantId: profile.tenant_id };
}

export async function getSupplierPortalDashboard(tenantId: string, supplierId: string) {
  const supabase = await createSupabaseServiceClient();
  const [ordersResult, capacityResult, scorecardResult] = await Promise.all([
    supabase.from("planned_orders").select("id, created_at, status, confirmed_date, supplier_response_status").eq("tenant_id", tenantId).eq("supplier_id", supplierId).eq("order_type", "purchase"),
    supabase.from("capacity_submissions").select("id, created_at, status, period_start, period_end").eq("tenant_id", tenantId).eq("supplier_id", supplierId).order("created_at", { ascending: false }),
    supabase.from("supplier_scorecards").select("*").eq("tenant_id", tenantId).eq("supplier_id", supplierId).order("score_year", { ascending: false }).order("score_month", { ascending: false }).limit(1)
  ]);
  if (ordersResult.error || capacityResult.error || scorecardResult.error) {
    throw new ProblemDetail(500, "Portal Dashboard Failed", ordersResult.error?.message ?? capacityResult.error?.message ?? scorecardResult.error?.message ?? "Unable to load supplier dashboard.");
  }
  const orders = ordersResult.data ?? [];
  const capacities = capacityResult.data ?? [];
  const latestScorecard = ((scorecardResult.data ?? [])[0] as SupplierScorecard | undefined) ?? null;
  const recentActivity = [
    ...orders.slice(0, 3).map((order: { id: string; created_at: string; supplier_response_status: string }) => ({ id: order.id, text: `Purchase order ${order.id.slice(0, 8)} is ${order.supplier_response_status}.`, created_at: order.created_at })),
    ...capacities.slice(0, 3).map((submission: { id: string; created_at: string; status: string; period_start: string }) => ({ id: submission.id, text: `Capacity submission for ${submission.period_start} is ${submission.status}.`, created_at: submission.created_at }))
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return {
    open_po_count: orders.filter((order: { supplier_response_status: string; status: string }) => order.status !== "completed" && order.supplier_response_status !== "rejected").length,
    submitted_capacity_periods: capacities.filter((submission: { status: string }) => submission.status === "submitted" || submission.status === "acknowledged").length,
    scorecard_grade: latestScorecard?.grade ?? "N/A",
    recent_activity: recentActivity,
    latest_scorecard: latestScorecard
  };
}

export async function listSupplierPortalOrders(tenantId: string, supplierId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("planned_orders")
    .select("id, product_id, quantity, due_date, status, confirmed_date, confirmed_qty, supplier_response_status, supplier_response_reason, products(sku, name)")
    .eq("tenant_id", tenantId)
    .eq("supplier_id", supplierId)
    .eq("order_type", "purchase")
    .order("due_date", { ascending: true });
  if (error) {
    throw new ProblemDetail(500, "Portal Orders Failed", error.message);
  }
  return data ?? [];
}

export async function respondToSupplierOrder(input: { tenantId: string; supplierId: string; orderId: string; payload: { confirmed_qty?: number | null; confirmed_date?: string | null; rejected?: boolean; reason?: string | null } }) {
  const supabase = await createSupabaseServiceClient();
  const patch = input.payload.rejected
    ? { supplier_response_status: "rejected", supplier_response_reason: input.payload.reason ?? null }
    : {
        supplier_response_status: "acknowledged",
        confirmed_qty: input.payload.confirmed_qty ?? null,
        confirmed_date: input.payload.confirmed_date ?? null,
        supplier_response_reason: input.payload.reason ?? null
      };
  const { data, error } = await supabase.from("planned_orders").update(patch).eq("tenant_id", input.tenantId).eq("supplier_id", input.supplierId).eq("id", input.orderId).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Order Response Failed", error?.message ?? "Unable to update order response.");
  return data;
}

export async function listCapacitySubmissions(tenantId: string, supplierId?: string | null, status?: string | null, period?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("capacity_submissions").select("*, suppliers(name), products(sku, name)").eq("tenant_id", tenantId).order("period_start", { ascending: false });
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);
  if (period) query = query.eq("period_start", period);
  const { data, error } = await query;
  if (error) throw new ProblemDetail(500, "Capacity Query Failed", error.message);
  return data ?? [];
}

export async function upsertCapacitySubmission(input: { tenantId: string; supplierId: string; userId: string; payload: { product_id: string; period_start: string; period_end: string; available_qty: number; lead_time_days?: number | null; notes?: string | null; status?: "draft" | "submitted" } }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("capacity_submissions").insert({ tenant_id: input.tenantId, supplier_id: input.supplierId, product_id: input.payload.product_id, period_start: input.payload.period_start, period_end: input.payload.period_end, available_qty: input.payload.available_qty, lead_time_days: input.payload.lead_time_days ?? null, notes: input.payload.notes ?? null, status: input.payload.status ?? "draft", submitted_by: input.userId, submitted_at: input.payload.status === "submitted" ? new Date().toISOString() : null }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Capacity Save Failed", error?.message ?? "Unable to save capacity submission.");
  return data;
}

export async function listSupplierScorecards(tenantId: string, supplierId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("supplier_scorecards").select("*").eq("tenant_id", tenantId).eq("supplier_id", supplierId).order("score_year", { ascending: false }).order("score_month", { ascending: false }).limit(12);
  if (error) throw new ProblemDetail(500, "Scorecard Query Failed", error.message);
  return (data ?? []) as SupplierScorecard[];
}

export async function listSopCycles(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sop_cycles").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new ProblemDetail(500, "S&OP Query Failed", error.message);
  return data ?? [];
}

export async function createSopCycle(tenantId: string, payload: { cycle_name: string; cycle_month: number; cycle_year: number }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sop_cycles").insert({ tenant_id: tenantId, cycle_name: payload.cycle_name, cycle_month: payload.cycle_month, cycle_year: payload.cycle_year, status: "statistical_forecast" }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "S&OP Create Failed", error?.message ?? "Unable to create cycle.");
  return data;
}

export async function getSopCycleDetail(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const [cycleResult, actionsResult] = await Promise.all([
    supabase.from("sop_cycles").select("*").eq("tenant_id", tenantId).eq("id", id).single(),
    supabase.from("sop_actions").select("*").eq("tenant_id", tenantId).eq("sop_cycle_id", id).order("created_at", { ascending: false })
  ]);
  if (cycleResult.error || !cycleResult.data) throw new ProblemDetail(404, "Not Found", cycleResult.error?.message ?? "S&OP cycle not found.");
  if (actionsResult.error) throw new ProblemDetail(500, "Action Query Failed", actionsResult.error.message);
  return { cycle: cycleResult.data, steps: sopSteps, actions: actionsResult.data ?? [] };
}

export async function advanceSopCycle(tenantId: string, id: string) {
  const detail = await getSopCycleDetail(tenantId, id);
  const currentIndex = sopSteps.indexOf(detail.cycle.status as (typeof sopSteps)[number]);
  const currentActions = detail.actions.filter((action: { status: string }) => action.status !== "completed" && action.status !== "cancelled");
  if (currentActions.length > 0 && detail.cycle.status !== "statistical_forecast") {
    throw new ProblemDetail(409, "Conflict", "Current S&OP step still has incomplete actions.");
  }
  const nextStatus = sopSteps[Math.min(currentIndex + 1, sopSteps.length - 1)];
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sop_cycles").update({ status: nextStatus, completed_at: nextStatus === "complete" ? new Date().toISOString() : null }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Advance Failed", error?.message ?? "Unable to advance cycle.");
  return data;
}

export async function createSopAction(tenantId: string, cycleId: string, payload: { title: string; description?: string | null; owner_id?: string | null; due_date?: string | null; priority?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sop_actions").insert({ tenant_id: tenantId, sop_cycle_id: cycleId, title: payload.title, description: payload.description ?? null, owner_id: payload.owner_id ?? null, due_date: payload.due_date ?? null, priority: payload.priority ?? "medium" }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Action Create Failed", error?.message ?? "Unable to create action.");
  return data;
}

export async function updateSopAction(tenantId: string, cycleId: string, actionId: string, payload: { status?: string | null; owner_id?: string | null; due_date?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sop_actions").update({ status: payload.status ?? undefined, owner_id: payload.owner_id ?? undefined, due_date: payload.due_date ?? undefined, completed_at: payload.status === "completed" ? new Date().toISOString() : null }).eq("tenant_id", tenantId).eq("sop_cycle_id", cycleId).eq("id", actionId).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Action Update Failed", error?.message ?? "Unable to update action.");
  return data;
}

function gradeScore(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export async function calculateSupplierScorecardsForTenant(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [suppliersResult, ordersResult] = await Promise.all([
    supabase.from("suppliers").select("id").eq("tenant_id", tenantId),
    supabase.from("planned_orders").select("supplier_id, due_date, confirmed_date, confirmed_qty, quantity").eq("tenant_id", tenantId).eq("order_type", "purchase").not("supplier_id", "is", null)
  ]);
  if (suppliersResult.error || ordersResult.error) throw new ProblemDetail(500, "Scorecard Calc Failed", suppliersResult.error?.message ?? ordersResult.error?.message ?? "Unable to calculate scorecards.");
  const now = new Date();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

  for (const supplier of suppliersResult.data ?? []) {
    const supplierOrders = (ordersResult.data ?? []).filter((order: { supplier_id: string | null }) => order.supplier_id === supplier.id);
    const total = supplierOrders.length;
    const otifOrders = supplierOrders.filter((order: { confirmed_date: string | null; due_date: string; confirmed_qty: number | null; quantity: number }) => !!order.confirmed_date && new Date(order.confirmed_date) <= new Date(order.due_date) && Number(order.confirmed_qty ?? 0) >= Number(order.quantity)).length;
    const otifPct = total > 0 ? (otifOrders / total) * 100 : 100;
    const leadTimeAdherence = total > 0 ? supplierOrders.reduce((sum: number, order: { confirmed_date: string | null; due_date: string }) => { if (!order.confirmed_date) return sum; const promised = 1; const actual = Math.max(1, Math.abs((new Date(order.confirmed_date).getTime() - new Date(order.due_date).getTime()) / (1000 * 60 * 60 * 24))); return sum + (1 - Math.abs(actual - promised) / promised) * 100; }, 0) / total : 100;
    const defectRate = 2;
    const composite = 0.5 * otifPct + 0.3 * leadTimeAdherence + 0.2 * (100 - defectRate);
    await supabase.from("supplier_scorecards").upsert({ tenant_id: tenantId, supplier_id: supplier.id, score_month: month, score_year: year, otif_pct: Number(otifPct.toFixed(2)), lead_time_adherence_pct: Number(leadTimeAdherence.toFixed(2)), defect_rate_pct: defectRate, composite_score: Number(composite.toFixed(2)), grade: gradeScore(composite) });
  }
}

export async function getSupplierCapacityGap(tenantId: string, supplierId: string) {
  const supabase = await createSupabaseServiceClient();
  const [submissionsResult, ordersResult] = await Promise.all([
    supabase.from("capacity_submissions").select("product_id, period_start, available_qty").eq("tenant_id", tenantId).eq("supplier_id", supplierId),
    supabase.from("planned_orders").select("product_id, due_date, quantity").eq("tenant_id", tenantId).eq("supplier_id", supplierId).eq("order_type", "purchase")
  ]);
  if (submissionsResult.error || ordersResult.error) throw new ProblemDetail(500, "Capacity Gap Failed", submissionsResult.error?.message ?? ordersResult.error?.message ?? "Unable to calculate capacity gap.");
  const periods = new Map<string, { period: string; product: string; demand_qty: number; submitted_capacity: number }>();
  for (const order of ordersResult.data ?? []) {
    const key = `${order.product_id}:${order.due_date}`;
    const current = periods.get(key) ?? { period: order.due_date, product: order.product_id, demand_qty: 0, submitted_capacity: 0 };
    current.demand_qty += Number(order.quantity);
    periods.set(key, current);
  }
  for (const submission of submissionsResult.data ?? []) {
    const key = `${submission.product_id}:${submission.period_start}`;
    const current = periods.get(key) ?? { period: submission.period_start, product: submission.product_id, demand_qty: 0, submitted_capacity: 0 };
    current.submitted_capacity += Number(submission.available_qty);
    periods.set(key, current);
  }
  return Array.from(periods.values()).map((row) => ({ ...row, gap_qty: Number((row.demand_qty - row.submitted_capacity).toFixed(2)) })).sort((a, b) => a.period.localeCompare(b.period));
}

export async function acknowledgeCapacitySubmission(tenantId: string, supplierId: string, submissionId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("capacity_submissions").update({ status: "acknowledged" }).eq("tenant_id", tenantId).eq("supplier_id", supplierId).eq("id", submissionId).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Acknowledge Failed", error?.message ?? "Unable to acknowledge capacity submission.");
  return data;
}

export async function getPlannerSupplierSummary(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [suppliersResult, scorecardsResult] = await Promise.all([
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("supplier_scorecards").select("*").eq("tenant_id", tenantId).order("score_year", { ascending: false }).order("score_month", { ascending: false })
  ]);
  if (suppliersResult.error || scorecardsResult.error) throw new ProblemDetail(500, "Supplier Summary Failed", suppliersResult.error?.message ?? scorecardsResult.error?.message ?? "Unable to load supplier summary.");
  return (suppliersResult.data ?? []).map((supplier: { id: string; name: string; country_code: string | null; risk_rating: string }) => {
    const latest = (scorecardsResult.data ?? []).find((scorecard: { supplier_id: string }) => scorecard.supplier_id === supplier.id) as SupplierScorecard | undefined;
    return { ...supplier, last_scorecard_grade: latest?.grade ?? "N/A", otif_pct: latest?.otif_pct ?? 0 };
  });
}

export async function generateSopMeetingPack(tenantId: string, cycleId: string) {
  const supabase = await createSupabaseServiceClient();
  const [detail, kpisResult, exceptionsResult, demandResult, ordersResult] = await Promise.all([
    getSopCycleDetail(tenantId, cycleId),
    supabase.from("kpi_snapshots").select("kpi_name, value, target_value, vs_target_pct").eq("tenant_id", tenantId).order("calculated_at", { ascending: false }).limit(6),
    supabase.from("exceptions").select("title, severity").eq("tenant_id", tenantId).in("severity", ["critical", "high"]).order("priority_score", { ascending: false }).limit(5),
    supabase.from("forecast_overrides").select("statistical_qty, proposed_qty, period_start").eq("tenant_id", tenantId).eq("status", "approved").limit(10),
    supabase.from("planned_orders").select("facility_id, quantity, status").eq("tenant_id", tenantId).limit(20)
  ]);

  if (kpisResult.error || exceptionsResult.error || demandResult.error || ordersResult.error) {
    throw new ProblemDetail(500, "Meeting Pack Failed", kpisResult.error?.message ?? exceptionsResult.error?.message ?? demandResult.error?.message ?? ordersResult.error?.message ?? "Unable to build meeting pack.");
  }

  const cacheKey = `meeting-pack:${cycleId}`;
  const { data: cached } = await supabase.from("job_results").select("*").eq("tenant_id", tenantId).eq("job_type", cacheKey).order("created_at", { ascending: false }).limit(1);
  const existing = (cached ?? [])[0] as { result?: { path?: string; generated_at?: string } } | undefined;
  if (existing?.result?.generated_at && Date.now() - new Date(existing.result.generated_at).getTime() < 4 * 60 * 60 * 1000 && existing.result.path) {
    const signed = await supabase.storage.from("meeting-packs").createSignedUrl(existing.result.path, 3600);
    if (!signed.error) {
      return { url: signed.data.signedUrl, cached: true };
    }
  }

  const doc = createElement(Document, null,
    createElement(Page, { size: "A4", style: styles.page },
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.title }, detail.cycle.cycle_name),
        createElement(Text, { style: styles.text }, `${detail.cycle.cycle_month}/${detail.cycle.cycle_year} · ${detail.cycle.status}`)
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.heading }, "Executive KPI Summary"),
        ...(kpisResult.data ?? []).map((kpi: { kpi_name: string; value: number | null; target_value: number | null; vs_target_pct: number | null }, index: number) => createElement(View, { key: index, style: styles.row }, createElement(Text, null, kpi.kpi_name), createElement(Text, null, `${kpi.value ?? 0} vs ${kpi.target_value ?? 0}`)))
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.heading }, "Demand Review"),
        ...(demandResult.data ?? []).map((row: { period_start: string; statistical_qty: number; proposed_qty: number }, index: number) => createElement(Text, { key: index, style: styles.text }, `${row.period_start}: ${row.statistical_qty} -> ${row.proposed_qty}`))
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.heading }, "Supply Review"),
        ...(ordersResult.data ?? []).map((row: { facility_id: string; quantity: number; status: string }, index: number) => createElement(Text, { key: index, style: styles.text }, `${row.facility_id}: ${row.quantity} (${row.status})`))
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.heading }, "Open Exceptions"),
        ...(exceptionsResult.data ?? []).map((row: { title: string; severity: string }, index: number) => createElement(Text, { key: index, style: styles.text }, `[${row.severity}] ${row.title}`))
      ),
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.heading }, "Decisions & Actions"),
        ...detail.actions.map((action: { title: string; status: string }, index: number) => createElement(Text, { key: index, style: styles.text }, `${action.title} - ${action.status}`))
      )
    )
  );

  const buffer = await pdf(doc).toBuffer();
  try {
    await supabase.storage.createBucket("meeting-packs", { public: false });
  } catch {}
  const path = `${tenantId}/${cycleId}/meeting-pack-${Date.now()}.pdf`;
  const upload = await supabase.storage.from("meeting-packs").upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new ProblemDetail(500, "Meeting Pack Upload Failed", upload.error.message);
  await supabase.from("job_results").insert({ tenant_id: tenantId, job_type: cacheKey, status: "completed", result: { path, generated_at: new Date().toISOString() } });
  const signed = await supabase.storage.from("meeting-packs").createSignedUrl(path, 3600);
  if (signed.error) throw new ProblemDetail(500, "Meeting Pack Sign Failed", signed.error.message);
  return { url: signed.data.signedUrl, cached: false };
}

