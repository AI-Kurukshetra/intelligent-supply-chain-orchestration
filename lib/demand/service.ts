import { createElement } from "react";

import { resend } from "@/lib/email/client";
import { ForecastEngine } from "@/lib/forecasting/engine";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { ForecastOverrideSchema, ForecastRunSchema, ManualDemandHistorySchema } from "@/lib/validation/demand";
import { ProblemDetail } from "@/lib/utils/errors";
import { applyPagination } from "@/lib/utils/pagination";

export type DemandHistoryRow = Database["public"]["Tables"]["demand_history"]["Row"];
export type StatisticalForecastRow = Database["public"]["Tables"]["statistical_forecasts"]["Row"];
export type ForecastOverrideRow = Database["public"]["Tables"]["forecast_overrides"]["Row"];
export type ForecastRunRow = Database["public"]["Tables"]["forecast_runs"]["Row"];
export type ForecastAccuracyRow = Database["public"]["Tables"]["forecast_accuracy"]["Row"];

export async function getLatestForecastRun(tenantId: string, facilityId?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase
    .from("forecast_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["completed", "completed_with_errors", "dispatched", "running"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (facilityId) {
    query = query.eq("facility_id", facilityId);
  }

  const { data, error } = await query;
  if (error) {
    throw new ProblemDetail(500, "Run Lookup Failed", error.message);
  }

  return ((data ?? [])[0] as ForecastRunRow | undefined) ?? null;
}

export async function listForecastRuns(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("forecast_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new ProblemDetail(500, "Runs Query Failed", error.message);
  }

  return (data ?? []) as ForecastRunRow[];
}

export async function getForecastRun(tenantId: string, runId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("forecast_runs").select("*").eq("tenant_id", tenantId).eq("id", runId).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Forecast run not found.");
  }
  return data as ForecastRunRow;
}

export async function createForecastRun(input: {
  tenantId: string;
  userId: string;
  facilityId?: string | null;
  productIds: string[];
  horizonWeeks: number;
}) {
  const serviceClient = await createSupabaseServiceClient();
  const payload = {
    tenant_id: input.tenantId,
    facility_id: input.facilityId ?? null,
    horizon_weeks: input.horizonWeeks,
    status: "queued",
    product_ids: input.productIds,
    total_products: input.productIds.length,
    processed_products: 0,
    failed_products: 0,
    triggered_by: input.userId,
    result_summary: {}
  };
  const { data, error } = await serviceClient.from("forecast_runs").insert(payload).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "Run Creation Failed", error?.message ?? "Unable to create forecast run.");
  }
  return data as ForecastRunRow;
}

export async function listForecasts(input: {
  tenantId: string;
  productId?: string | null;
  facilityId?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  runId?: string | null;
}) {
  const supabase = await createSupabaseServiceClient();
  const runId = input.runId ?? (await getLatestForecastRun(input.tenantId, input.facilityId))?.id;
  if (!runId) {
    return [] as StatisticalForecastRow[];
  }

  let query = supabase
    .from("statistical_forecasts")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("run_id", runId)
    .order("period_start", { ascending: true });

  if (input.productId) {
    query = query.eq("product_id", input.productId);
  }
  if (input.facilityId) {
    query = query.eq("facility_id", input.facilityId);
  }
  if (input.periodFrom) {
    query = query.gte("period_start", input.periodFrom);
  }
  if (input.periodTo) {
    query = query.lte("period_end", input.periodTo);
  }

  const { data, error } = await query;
  if (error) {
    throw new ProblemDetail(500, "Forecast Query Failed", error.message);
  }
  return (data ?? []) as StatisticalForecastRow[];
}

export async function listDemandHistory(input: {
  tenantId: string;
  productId?: string | null;
  facilityId?: string | null;
  cursor?: string | null;
  limit: number;
}) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase
    .from("demand_history")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false });

  if (input.productId) {
    query = query.eq("product_id", input.productId);
  }
  if (input.facilityId) {
    query = query.eq("facility_id", input.facilityId);
  }

  return applyPagination(query, input.cursor ?? undefined, input.limit);
}

export async function createDemandHistoryEntry(tenantId: string, payload: unknown) {
  const parsed = ManualDemandHistorySchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("demand_history").insert({ ...parsed, tenant_id: tenantId }).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "History Entry Failed", error?.message ?? "Unable to create demand history entry.");
  }
  return data as DemandHistoryRow;
}

export async function listOverrides(input: {
  tenantId: string;
  status?: string | null;
  productId?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
}) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase
    .from("forecast_overrides")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false });

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.productId) {
    query = query.eq("product_id", input.productId);
  }
  if (input.periodFrom) {
    query = query.gte("period_start", input.periodFrom);
  }
  if (input.periodTo) {
    query = query.lte("period_end", input.periodTo);
  }

  const { data, error } = await query;
  if (error) {
    throw new ProblemDetail(500, "Override Query Failed", error.message);
  }

  return (data ?? []) as ForecastOverrideRow[];
}

export async function getOverride(tenantId: string, overrideId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("forecast_overrides").select("*").eq("tenant_id", tenantId).eq("id", overrideId).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Forecast override not found.");
  }
  return data as ForecastOverrideRow;
}

export async function createOverride(tenantId: string, userId: string, payload: unknown) {
  const parsed = ForecastOverrideSchema.parse(payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("forecast_overrides")
    .insert({ ...parsed, tenant_id: tenantId, proposed_by: userId, status: "pending" })
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Override Create Failed", error?.message ?? "Unable to create forecast override.");
  }

  return data as ForecastOverrideRow;
}

export async function approveOverride(tenantId: string, userId: string, overrideId: string) {
  const serviceClient = await createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("forecast_overrides")
    .update({ status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", overrideId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Override Approval Failed", error?.message ?? "Unable to approve forecast override.");
  }
  return data as ForecastOverrideRow;
}

export async function rejectOverride(tenantId: string, userId: string, overrideId: string, reason?: string) {
  const serviceClient = await createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("forecast_overrides")
    .update({ status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString(), reason })
    .eq("tenant_id", tenantId)
    .eq("id", overrideId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Override Rejection Failed", error?.message ?? "Unable to reject forecast override.");
  }
  return data as ForecastOverrideRow;
}

export async function listActiveProducts(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, name, category")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("sku", { ascending: true });

  if (error) {
    throw new ProblemDetail(500, "Product Query Failed", error.message);
  }

  return (data ?? []) as Array<{ id: string; sku: string; name: string; category: string | null }>;
}

export async function listFacilities(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id, code, name, type")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) {
    throw new ProblemDetail(500, "Facility Query Failed", error.message);
  }
  return (data ?? []) as Array<{ id: string; code: string; name: string; type: string }>;
}

export async function getAccuracySummary(tenantId: string, facilityId?: string | null) {
  const latestRun = await getLatestForecastRun(tenantId, facilityId);
  if (!latestRun) {
    return { run: null, rows: [] as Array<Record<string, Json>>, overall: { mape: 0, wmape: 0, bias: 0 } };
  }

  const supabase = await createSupabaseServiceClient();
  let accuracyQuery = supabase
    .from("forecast_accuracy")
    .select("*, products(category, sku, name)")
    .eq("tenant_id", tenantId)
    .eq("run_id", latestRun.id);

  if (facilityId) {
    accuracyQuery = accuracyQuery.eq("facility_id", facilityId);
  }

  const { data, error } = await accuracyQuery;
  if (error) {
    throw new ProblemDetail(500, "Accuracy Query Failed", error.message);
  }

  const rows = (data ?? []) as Array<{ mape: number | null; wmape: number | null; bias: number | null; products?: { category?: string; sku?: string; name?: string } | null }>;
  const totals = rows.reduce<{ mape: number; wmape: number; bias: number }>(
    (accumulator, row) => ({
      mape: accumulator.mape + Number(row.mape ?? 0),
      wmape: accumulator.wmape + Number(row.wmape ?? 0),
      bias: accumulator.bias + Number(row.bias ?? 0)
    }),
    { mape: 0, wmape: 0, bias: 0 }
  );

  return {
    run: latestRun,
    rows,
    overall: rows.length > 0 ? { mape: totals.mape / rows.length, wmape: totals.wmape / rows.length, bias: totals.bias / rows.length } : { mape: 0, wmape: 0, bias: 0 }
  };
}

export async function buildDemandWorkbench(input: { tenantId: string; facilityId: string; horizonWeeks: number }) {
  const [products, forecasts, overrides, history] = await Promise.all([
    listActiveProducts(input.tenantId),
    listForecasts({ tenantId: input.tenantId, facilityId: input.facilityId }),
    listOverrides({ tenantId: input.tenantId, status: null, productId: null, periodFrom: null, periodTo: null }),
    listDemandHistory({ tenantId: input.tenantId, facilityId: input.facilityId, limit: 1000 })
  ]);

  const forecastRows = forecasts.filter((row) => row.facility_id === input.facilityId).slice(0, products.length * input.horizonWeeks);
  const facilityOverrides = overrides.filter((row) => row.facility_id === input.facilityId);
  const approvedOverrides = new Map(
    facilityOverrides.filter((row) => row.status === "approved").map((row) => [`${row.product_id}:${row.period_start}`, row])
  );

  const periods = Array.from(new Set(forecastRows.map((row) => row.period_start))).sort().slice(0, input.horizonWeeks);
  const chartSeries = new Map<string, { actual: Array<{ period: string; value: number }>; statistical: Array<{ period: string; value: number }>; consensus: Array<{ period: string; value: number }> }>();

  const rows = products.map((product) => {
    const rowForecasts = forecastRows.filter((forecast) => forecast.product_id === product.id).sort((left, right) => left.period_start.localeCompare(right.period_start)).slice(0, input.horizonWeeks);
    const shaped: Record<string, Json> = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category
    };

    const actuals = (history.data as DemandHistoryRow[])
      .filter((entry) => entry.product_id === product.id)
      .sort((left, right) => left.period_start.localeCompare(right.period_start))
      .slice(-13)
      .map((entry) => ({ period: entry.period_start, value: Number(entry.actual_qty) }));

    const statistical = rowForecasts.map((forecast) => ({ period: forecast.period_start, value: Number(forecast.forecast_qty) }));
    const consensus = rowForecasts.map((forecast) => {
      const override = approvedOverrides.get(`${forecast.product_id}:${forecast.period_start}`);
      return { period: forecast.period_start, value: Number(override?.proposed_qty ?? forecast.forecast_qty) };
    });

    periods.forEach((period, index) => {
      const forecast = rowForecasts.find((candidate) => candidate.period_start === period);
      const override = forecast ? approvedOverrides.get(`${forecast.product_id}:${forecast.period_start}`) : undefined;
      shaped[`P${index + 1}`] = Number(override?.proposed_qty ?? forecast?.forecast_qty ?? 0);
      shaped[`P${index + 1}_statistical`] = Number(forecast?.forecast_qty ?? 0);
      shaped[`P${index + 1}_reason`] = override?.reason_code ?? null;
      shaped[`P${index + 1}_period_start`] = period;
      shaped[`P${index + 1}_period_end`] = forecast?.period_end ?? null;
    });

    chartSeries.set(product.id, { actual: actuals, statistical, consensus });
    return shaped;
  });

  return {
    periods,
    rows,
    chartSeries: Object.fromEntries(chartSeries),
    overrides: facilityOverrides,
    latestRun: await getLatestForecastRun(input.tenantId, input.facilityId)
  };
}

export async function upsertForecastResults(input: {
  tenantId: string;
  runId: string;
  productId: string;
  facilityId: string;
  model: string;
  forecasts: Array<{ period_start: string; period_end: string; forecast_qty: number; lower_bound_qty: number; upper_bound_qty: number; confidence_pct: number }>;
  accuracy: { mape: number; wmape: number; bias: number; mae: number };
}) {
  const serviceClient = await createSupabaseServiceClient();
  const forecastRows = input.forecasts.map((forecast) => ({
    tenant_id: input.tenantId,
    product_id: input.productId,
    facility_id: input.facilityId,
    run_id: input.runId,
    period_start: forecast.period_start,
    period_end: forecast.period_end,
    forecast_qty: forecast.forecast_qty,
    lower_bound_qty: forecast.lower_bound_qty,
    upper_bound_qty: forecast.upper_bound_qty,
    confidence_pct: forecast.confidence_pct,
    model_type: input.model
  }));

  const accuracyRow = {
    tenant_id: input.tenantId,
    product_id: input.productId,
    facility_id: input.facilityId,
    run_id: input.runId,
    horizon_weeks: input.forecasts.length,
    mape: input.accuracy.mape,
    wmape: input.accuracy.wmape,
    bias: input.accuracy.bias,
    mae: input.accuracy.mae,
    calculated_at: new Date().toISOString()
  };

  const { error: forecastError } = await serviceClient.from("statistical_forecasts").insert(forecastRows);
  if (forecastError) {
    throw new ProblemDetail(500, "Forecast Persist Failed", forecastError.message);
  }

  const { error: accuracyError } = await serviceClient.from("forecast_accuracy").insert(accuracyRow);
  if (accuracyError) {
    throw new ProblemDetail(500, "Accuracy Persist Failed", accuracyError.message);
  }
}

export async function markForecastRunStatus(runId: string, patch: Partial<ForecastRunRow>) {
  const serviceClient = await createSupabaseServiceClient();
  const { error } = await serviceClient.from("forecast_runs").update(patch).eq("id", runId);
  if (error) {
    throw new ProblemDetail(500, "Run Update Failed", error.message);
  }
}

export async function incrementForecastRunProgress(input: { runId: string; failed?: boolean }) {
  const serviceClient = await createSupabaseServiceClient();
  const { data, error } = await serviceClient.from("forecast_runs").select("*").eq("id", input.runId).single();
  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", error?.message ?? "Forecast run not found.");
  }

  const nextProcessed = Number(data.processed_products ?? 0) + 1;
  const nextFailed = Number(data.failed_products ?? 0) + (input.failed ? 1 : 0);
  const completed = nextProcessed >= Number(data.total_products ?? 0);
  const nextStatus = completed ? (nextFailed > 0 ? "completed_with_errors" : "completed") : "running";

  const { data: updated, error: updateError } = await serviceClient
    .from("forecast_runs")
    .update({
      processed_products: nextProcessed,
      failed_products: nextFailed,
      status: nextStatus,
      completed_at: completed ? new Date().toISOString() : null,
      result_summary: {
        ...(data.result_summary as Record<string, Json>),
        last_updated_at: new Date().toISOString(),
        processed_products: nextProcessed,
        failed_products: nextFailed
      }
    })
    .eq("id", input.runId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new ProblemDetail(500, "Run Progress Failed", updateError?.message ?? "Unable to update run progress.");
  }

  return updated as ForecastRunRow;
}

export async function maybeNotifyRunCompletion(run: ForecastRunRow) {
  if (!["completed", "completed_with_errors"].includes(run.status)) {
    return;
  }

  const serviceClient = await createSupabaseServiceClient();
  const { data: profile } = await serviceClient.from("profiles").select("email, first_name").eq("id", run.triggered_by ?? "").single();
  if (!profile?.email) {
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "ISCOP <no-reply@iscop.ai>",
    to: profile.email,
    subject: `Forecast run ${run.status.replace(/_/g, " ")}`,
    react: createElement("div", null, [
      createElement("h1", { key: "title" }, "Demand forecast run finished"),
      createElement("p", { key: "summary" }, `${profile.first_name ?? "Team"}, run ${run.id} finished with status ${run.status}.`),
      createElement("p", { key: "metrics" }, `${run.processed_products} products processed, ${run.failed_products} failures.`)
    ])
  });
}

export async function runForecastForProduct(input: { tenantId: string; runId: string; productId: string; facilityId: string; horizonWeeks: number }) {
  const engine = new ForecastEngine();
  const result = await engine.run({
    tenantId: input.tenantId,
    productId: input.productId,
    facilityId: input.facilityId,
    horizonWeeks: input.horizonWeeks
  });

  await upsertForecastResults({
    tenantId: input.tenantId,
    runId: input.runId,
    productId: input.productId,
    facilityId: input.facilityId,
    model: result.model,
    forecasts: result.forecasts,
    accuracy: result.accuracy
  });

  return result;
}

export async function resolveForecastRunProducts(tenantId: string, payload: unknown) {
  const parsed = ForecastRunSchema.parse(payload);
  if (parsed.product_ids && parsed.product_ids.length > 0) {
    return { facilityId: parsed.facility_id ?? null, horizonWeeks: parsed.horizon_weeks, productIds: parsed.product_ids };
  }

  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("products").select("id").eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null);
  if (parsed.product_id) {
    query = query.eq("id", parsed.product_id);
  }
  const { data, error } = await query;
  if (error) {
    throw new ProblemDetail(500, "Product Resolution Failed", error.message);
  }

  return {
    facilityId: parsed.facility_id ?? null,
    horizonWeeks: parsed.horizon_weeks,
    productIds: (data ?? []).map((row: { id: string }) => row.id)
  };
}




