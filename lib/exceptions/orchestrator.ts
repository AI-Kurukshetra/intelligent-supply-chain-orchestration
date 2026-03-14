import { resend } from "@/lib/email/client";
import { ExceptionAlertEmail } from "@/lib/email/templates/ExceptionAlertEmail";
import { createElement } from "react";

import { allDetectors, type ExceptionCandidate } from "@/lib/exceptions/detectors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProblemDetail } from "@/lib/utils/errors";
import { getRecommendation } from "@/lib/exceptions/ai-recommendations";

const severityWeights = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25
} as const;

type ExceptionRow = {
  id: string;
  tenant_id: string;
  exception_type: string;
  severity: keyof typeof severityWeights;
  status: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  facility_id: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolution_action: string | null;
  priority_score: number;
  ai_recommendation: string | null;
  suppressed_until: string | null;
  context_json: Record<string, unknown>;
  last_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  exception_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

function calculatePriority(severity: keyof typeof severityWeights, detectedAt?: string | null) {
  const base = severityWeights[severity];
  if (!detectedAt) return base;
  const ageDays = Math.max(0, (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24));
  const decay = ageDays > 7 ? Math.min(20, Math.floor(ageDays - 7)) : 0;
  return Math.max(10, base - decay);
}

export class ExceptionOrchestrator {
  async runAll(tenantId: string): Promise<void> {
    const supabase = await createSupabaseServiceClient();
    const [detectorResults, existingResult] = await Promise.all([
      Promise.all(allDetectors.map((detect) => detect(supabase as never, tenantId))),
      supabase.from("exceptions").select("id, exception_type, entity_id, severity, detected_at").eq("tenant_id", tenantId).in("status", ["open", "acknowledged", "in_progress", "suppressed"])
    ]);

    if (existingResult.error) {
      throw new ProblemDetail(500, "Existing Exception Query Failed", existingResult.error.message);
    }

    const existingKeys = new Set((existingResult.data ?? []).map((row: { exception_type: string; entity_id: string | null }) => `${row.exception_type}:${row.entity_id ?? "none"}`));
    const candidates = detectorResults.flat().filter((candidate: ExceptionCandidate) => !existingKeys.has(`${candidate.exception_type}:${candidate.entity_id ?? "none"}`));

    if (candidates.length === 0) {
      return;
    }

    const inserts = candidates.map((candidate: ExceptionCandidate) => ({
      tenant_id: tenantId,
      exception_type: candidate.exception_type,
      severity: candidate.severity,
      status: "open",
      title: candidate.title,
      description: candidate.description,
      entity_type: candidate.entity_type,
      entity_id: candidate.entity_id,
      entity_name: candidate.entity_name,
      facility_id: candidate.facility_id,
      priority_score: calculatePriority(candidate.severity),
      context_json: candidate.context_json,
      detected_at: new Date().toISOString()
    }));

    const { data, error } = await supabase.from("exceptions").insert(inserts).select("id, severity");
    if (error) {
      throw new ProblemDetail(500, "Exception Insert Failed", error.message);
    }

    const alertIds = (data ?? []).filter((row: { severity: string }) => ["critical", "high"].includes(row.severity)).map((row: { id: string }) => row.id);
    if (alertIds.length > 0) {
      const { inngest } = await import("@/lib/inngest/client");
      await inngest.send({ name: "exceptions/alerts.send", data: { exception_ids: alertIds, tenant_id: tenantId } });
    }
  }
}

export async function listExceptions(input: {
  tenantId: string;
  type?: string | null;
  severity?: string | null;
  status?: string | null;
  entityId?: string | null;
}) {
  const supabase = await createSupabaseServiceClient();
  let query = supabase.from("exceptions").select("*").eq("tenant_id", input.tenantId).order("priority_score", { ascending: false });
  if (input.type) query = query.eq("exception_type", input.type);
  if (input.severity) query = query.eq("severity", input.severity);
  if (input.status) query = query.eq("status", input.status);
  if (input.entityId) query = query.eq("entity_id", input.entityId);
  const { data, error } = await query.limit(200);
  if (error) throw new ProblemDetail(500, "Exception Query Failed", error.message);
  return (data ?? []) as ExceptionRow[];
}

export async function getExceptionAnalyticsSummary(tenantId: string) {
  const rows = await listExceptions({ tenantId });
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const row of rows) {
    byType[row.exception_type] = (byType[row.exception_type] ?? 0) + 1;
    bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
  }
  return { by_type: byType, by_severity: bySeverity, total: rows.length };
}

export async function getExceptionDetail(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const [exceptionResult, commentsResult] = await Promise.all([
    supabase.from("exceptions").select("*").eq("tenant_id", tenantId).eq("id", id).single(),
    supabase.from("exception_comments").select("*").eq("tenant_id", tenantId).eq("exception_id", id).order("created_at", { ascending: true })
  ]);
  if (exceptionResult.error || !exceptionResult.data) {
    throw new ProblemDetail(404, "Not Found", exceptionResult.error?.message ?? "Exception not found.");
  }
  if (commentsResult.error) {
    throw new ProblemDetail(500, "Comment Query Failed", commentsResult.error.message);
  }
  return { exception: exceptionResult.data as ExceptionRow, comments: (commentsResult.data ?? []) as CommentRow[] };
}

export async function acknowledgeException(tenantId: string, id: string, userId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: userId }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Acknowledge Failed", error?.message ?? "Unable to acknowledge exception.");
  return data as ExceptionRow;
}

export async function resolveException(tenantId: string, id: string, userId: string, payload: { resolution_notes?: string | null; resolution_action?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: userId, resolution_notes: payload.resolution_notes ?? null, resolution_action: payload.resolution_action ?? null }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Resolve Failed", error?.message ?? "Unable to resolve exception.");
  return data as ExceptionRow;
}

export async function suppressException(tenantId: string, id: string, suppressedUntil: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").update({ status: "suppressed", suppressed_until: suppressedUntil }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Suppress Failed", error?.message ?? "Unable to suppress exception.");
  return data as ExceptionRow;
}

export async function bulkResolveExceptions(tenantId: string, userId: string, payload: { ids: string[]; resolution_notes?: string | null; resolution_action?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: userId, resolution_notes: payload.resolution_notes ?? null, resolution_action: payload.resolution_action ?? null }).eq("tenant_id", tenantId).in("id", payload.ids).select("*");
  if (error) throw new ProblemDetail(500, "Bulk Resolve Failed", error.message);
  return (data ?? []) as ExceptionRow[];
}

export async function listExceptionComments(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exception_comments").select("*").eq("tenant_id", tenantId).eq("exception_id", id).order("created_at", { ascending: true });
  if (error) throw new ProblemDetail(500, "Comment Query Failed", error.message);
  return (data ?? []) as CommentRow[];
}

export async function addExceptionComment(tenantId: string, id: string, userId: string, comment: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exception_comments").insert({ tenant_id: tenantId, exception_id: id, user_id: userId, comment }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Comment Create Failed", error?.message ?? "Unable to add comment.");
  return data as CommentRow;
}

export async function getExceptionTrendData(tenantId: string) {
  const rows = await listExceptions({ tenantId });
  const weeklyByType: Record<string, Record<string, number>> = {};
  const resolutionTimeByType: Record<string, number[]> = {};
  const offenders = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    const week = row.created_at.slice(0, 10);
    weeklyByType[week] ??= {};
    weeklyByType[week][row.exception_type] = (weeklyByType[week][row.exception_type] ?? 0) + 1;
    if (row.resolved_at) {
      const hours = (new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
      resolutionTimeByType[row.exception_type] ??= [];
      resolutionTimeByType[row.exception_type].push(Number(hours.toFixed(2)));
    }
    const key = row.entity_name ?? row.entity_id ?? row.id;
    offenders.set(key, { name: key, count: (offenders.get(key)?.count ?? 0) + 1 });
  }
  return {
    weekly_opened: weeklyByType,
    resolution_time_by_type: Object.fromEntries(Object.entries(resolutionTimeByType).map(([key, values]) => [key, Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2))])),
    top_offenders: Array.from(offenders.values()).sort((a, b) => b.count - a.count).slice(0, 10)
  };
}

export async function sendExceptionAlertEmails(tenantId: string, exceptionIds: string[]) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").select("*").eq("tenant_id", tenantId).in("id", exceptionIds);
  if (error) throw new ProblemDetail(500, "Alert Query Failed", error.message);
  const exceptions = (data ?? []) as ExceptionRow[];
  const { data: recipients } = await supabase.from("profiles").select("email, first_name, role").eq("tenant_id", tenantId).in("role", ["planner", "sop_manager", "super_admin"]);

  for (const exception of exceptions) {
    if (exception.last_alert_sent_at && Date.now() - new Date(exception.last_alert_sent_at).getTime() < 60 * 60 * 1000) {
      continue;
    }
    for (const recipient of recipients ?? []) {
      if (!recipient.email) continue;
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "ISCOP <no-reply@iscop.ai>",
        to: recipient.email,
        subject: `[${String(exception.severity).toUpperCase()}] ${exception.title}`,
        react: createElement(ExceptionAlertEmail, {
          title: exception.title,
          severity: exception.severity,
          deepLink: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/exceptions`,
          description: exception.description ?? "A new exception requires attention."
        })
      });
    }
    await supabase.from("exceptions").update({ last_alert_sent_at: new Date().toISOString() }).eq("id", exception.id);
    await supabase.from("exception_alert_log").insert({ tenant_id: tenantId, exception_id: exception.id, alert_type: "email" });
  }
}

export async function generateAiRecommendation(tenantId: string, exceptionId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("exceptions").select("*").eq("tenant_id", tenantId).eq("id", exceptionId).single();
  if (error || !data) throw new ProblemDetail(404, "Not Found", error?.message ?? "Exception not found.");
  const recommendation = await getRecommendation({ exception_type: data.exception_type, context_json: data.context_json ?? {} });
  const { data: updated, error: updateError } = await supabase.from("exceptions").update({ ai_recommendation: recommendation }).eq("id", exceptionId).select("*").single();
  if (updateError || !updated) throw new ProblemDetail(500, "AI Recommendation Failed", updateError?.message ?? "Unable to update recommendation.");
  return updated as ExceptionRow;
}

