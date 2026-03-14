import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { createElement } from "react";

import { inngest } from "@/lib/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProblemDetail } from "@/lib/utils/errors";
import { calculateAllKpis } from "@/lib/analytics/kpis/engine";
import type { Database, Json } from "@/lib/supabase/types";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, color: "#0f172a" },
  section: { marginBottom: 16 },
  heading: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }
});

export function getDefaultPeriod() {
  const to = new Date();
  const from = new Date(to.getTime() - 28 * 86400000);
  return { from: from.toISOString(), to: to.toISOString(), granularity: "weekly" as const };
}

export async function refreshKpisForTenant(tenantId: string, period = getDefaultPeriod()) {
  const supabase = await createSupabaseServiceClient();
  const snapshots = await calculateAllKpis(tenantId, period);
  const { data, error } = await supabase.from("kpi_snapshots").upsert(snapshots as Database["public"]["Tables"]["kpi_snapshots"]["Insert"][]).select("*");
  if (error) {
    throw new ProblemDetail(500, "KPI Refresh Failed", error.message);
  }
  return data ?? [];
}

export async function getCurrentKpis(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("calculated_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new ProblemDetail(500, "KPI Query Failed", error.message);
  }
  const latest = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    if (!latest.has(String(row.kpi_code))) {
      latest.set(String(row.kpi_code), row as Record<string, unknown>);
    }
  }
  return Array.from(latest.values());
}

export async function getKpiHistory(tenantId: string, kpiCode: string, from?: string | null, to?: string | null, granularity?: string | null) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("kpi_snapshots").select("*").eq("tenant_id", tenantId).eq("kpi_code", kpiCode).order("period_start", { ascending: true });
  if (from) query = query.gte("period_start", from);
  if (to) query = query.lte("period_end", to);
  if (granularity) query = query.eq("granularity", granularity as Database["public"]["Tables"]["kpi_snapshots"]["Row"]["granularity"]);
  const { data, error } = await query.limit(104);
  if (error) throw new ProblemDetail(500, "KPI History Failed", error.message);
  return data ?? [];
}

export async function getDashboardData(tenantId: string, type: string) {
  const supabase = await createSupabaseServiceClient();
  const [kpis, exceptions, cycles, suppliers] = await Promise.all([
    getCurrentKpis(tenantId),
    supabase.from("exceptions").select("id, title, severity, detected_at").eq("tenant_id", tenantId).eq("status", "open").order("priority_score", { ascending: false }).limit(5),
    supabase.from("sop_cycles").select("id, cycle_name, status, cycle_month, cycle_year").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    supabase.from("supplier_scorecards").select("supplier_id, grade, otif_pct, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20)
  ]);

  const payload = {
    type,
    kpis,
    exceptions: exceptions.data ?? [],
    cycles: cycles.data ?? [],
    suppliers: suppliers.data ?? []
  };

  if (exceptions.error || cycles.error || suppliers.error) {
    throw new ProblemDetail(500, "Dashboard Query Failed", exceptions.error?.message ?? cycles.error?.message ?? suppliers.error?.message ?? "Unable to load dashboard data.");
  }

  return payload;
}

export async function listReportDefinitions(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_definitions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error) throw new ProblemDetail(500, "Report Query Failed", error.message);
  return data ?? [];
}

export async function getReportDefinition(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_definitions").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (error || !data) throw new ProblemDetail(404, "Not Found", error?.message ?? "Report definition not found.");
  return data;
}

export async function createReportDefinition(tenantId: string, userId: string, payload: { name: string; report_type: string; config: Record<string, unknown>; output_format: "pdf" | "excel" }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_definitions").insert({ tenant_id: tenantId, name: payload.name, report_type: payload.report_type, config: payload.config as Json, output_format: payload.output_format, created_by: userId }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Report Create Failed", error?.message ?? "Unable to create report definition.");
  return data;
}

export async function updateReportDefinition(tenantId: string, id: string, payload: { name: string; report_type: string; config: Record<string, unknown>; output_format: "pdf" | "excel" }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_definitions").update({ ...payload, config: payload.config as Json }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Report Update Failed", error?.message ?? "Unable to update report definition.");
  return data;
}

export async function deleteReportDefinition(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { error } = await supabase.from("report_definitions").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw new ProblemDetail(500, "Report Delete Failed", error.message);
  return { success: true };
}

export async function listReportRuns(tenantId: string, reportDefinitionId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_runs").select("*").eq("tenant_id", tenantId).eq("report_definition_id", reportDefinitionId).order("created_at", { ascending: false });
  if (error) throw new ProblemDetail(500, "Report Run Query Failed", error.message);
  return data ?? [];
}

export async function triggerReportRun(tenantId: string, reportDefinitionId: string) {
  const runId = crypto.randomUUID();
  await inngest.send({ name: "analytics/report.generate", data: { run_id: runId, report_definition_id: reportDefinitionId, tenant_id: tenantId } });
  return { run_id: runId, status: "queued" };
}

export async function getRunDownloadUrl(tenantId: string, runId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("report_runs").select("file_path").eq("tenant_id", tenantId).eq("id", runId).single();
  if (error || !data?.file_path) throw new ProblemDetail(404, "Not Found", error?.message ?? "Report run not found.");
  const signed = await supabase.storage.from("reports").createSignedUrl(data.file_path, 3600);
  if (signed.error) throw new ProblemDetail(500, "Download Failed", signed.error.message);
  return signed.data.signedUrl;
}

export async function executeReportRun(input: { tenantId: string; reportDefinitionId: string; runId?: string }) {
  const supabase = await createSupabaseServiceClient();
  const definition = await getReportDefinition(input.tenantId, input.reportDefinitionId);
  const runId = input.runId ?? crypto.randomUUID();
  const now = new Date().toISOString();
  await supabase.from("report_runs").upsert({ id: runId, tenant_id: input.tenantId, report_definition_id: input.reportDefinitionId, status: "running", output_format: definition.output_format, started_at: now });

  const currentKpis = await getCurrentKpis(input.tenantId);
  const filePath = `reports/${input.tenantId}/${input.reportDefinitionId}/${runId}.${definition.output_format === "pdf" ? "pdf" : "xlsx"}`;

  try {
    if (definition.output_format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("KPI Summary");
      worksheet.columns = [
        { header: "KPI", key: "kpi_name", width: 32 },
        { header: "Code", key: "kpi_code", width: 14 },
        { header: "Value", key: "value", width: 18 },
        { header: "UoM", key: "uom", width: 12 },
        { header: "Vs Prior %", key: "vs_prior_period_pct", width: 18 },
        { header: "Vs Target %", key: "vs_target_pct", width: 18 }
      ];
      currentKpis.forEach((row) => worksheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      const upload = await supabase.storage.from("reports").upload(filePath, buffer, { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
    } else {
      const doc = createElement(Document, null,
        createElement(Page, { size: "A4", style: styles.page },
          createElement(View, { style: styles.section },
            createElement(Text, { style: styles.heading }, String(definition.name)),
            createElement(Text, null, `Generated ${new Date().toUTCString()}`)
          ),
          ...currentKpis.map((row) => createElement(View, { key: String(row.kpi_code), style: styles.row }, createElement(Text, null, String(row.kpi_name)), createElement(Text, null, `${row.value} ${row.uom}`)))
        )
      );
      const buffer = await pdf(doc).toBuffer();
      const upload = await supabase.storage.from("reports").upload(filePath, buffer, { contentType: "application/pdf", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
    }

    await supabase.from("report_runs").update({ status: "completed", file_path: filePath, completed_at: new Date().toISOString() }).eq("id", runId).eq("tenant_id", input.tenantId);
    return { runId, filePath };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Report generation failed.";
    await supabase.from("report_runs").update({ status: "failed", error_message: detail, completed_at: new Date().toISOString() }).eq("id", runId).eq("tenant_id", input.tenantId);
    throw new ProblemDetail(500, "Report Generation Failed", detail);
  }
}




