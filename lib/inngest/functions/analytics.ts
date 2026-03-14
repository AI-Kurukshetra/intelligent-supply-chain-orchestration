import { render } from "@react-email/components";

import { ReportReadyEmail } from "@/lib/email/templates/ReportReadyEmail";
import { inngest } from "@/lib/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/client";
import { executeReportRun, getRunDownloadUrl, refreshKpisForTenant } from "@/lib/analytics/service";

export const calculateNightlyKpis = inngest.createFunction(
  { id: "analytics-calculate-nightly-kpis" },
  { cron: "0 4 * * *" },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T>; sendEvent: (id: string, payload: unknown) => Promise<unknown> } }) => {
    const supabase = await createSupabaseServiceClient();
    const { data: tenants } = await supabase.from("organizations").select("id").eq("status", "active");
    for (const tenant of tenants ?? []) {
      await step.run(`refresh-${tenant.id}`, async () => refreshKpisForTenant(tenant.id));
    }
    return { tenants: tenants?.length ?? 0 };
  }
);

export const generateScheduledReport = inngest.createFunction(
  { id: "analytics-generate-scheduled-report" },
  { cron: "*/5 * * * *" },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T>; sendEvent: (id: string, payload: unknown) => Promise<unknown> } }) => {
    const supabase = await createSupabaseServiceClient();
    const { data: schedules } = await supabase.from("scheduled_reports").select("*").lte("next_run_at", new Date().toISOString()).eq("is_active", true);
    for (const schedule of schedules ?? []) {
      await step.sendEvent(`report-${schedule.id}`, { name: "analytics/report.generate", data: { report_definition_id: schedule.report_definition_id, tenant_id: schedule.tenant_id } });
      await supabase.from("scheduled_reports").update({ next_run_at: new Date(Date.now() + 3600000).toISOString() }).eq("id", schedule.id);
    }
    return { due: schedules?.length ?? 0 };
  }
);

export const generateReport = inngest.createFunction(
  { id: "analytics-generate-report" },
  { event: "analytics/report.generate" },
  async ({ event, step }: { event: { data: { run_id?: string; report_definition_id: string; tenant_id: string } }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const result = await step.run("generate-report", async () => executeReportRun({ tenantId: event.data.tenant_id, reportDefinitionId: event.data.report_definition_id, runId: event.data.run_id }));
    await step.run("notify-report-ready", async () => {
      const supabase = await createSupabaseServiceClient();
      const { data: definition } = await supabase.from("report_definitions").select("name, created_by").eq("id", event.data.report_definition_id).single();
      if (!definition?.created_by) {
        return null;
      }
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", definition.created_by).single();
      if (!profile?.email) {
        return null;
      }
      const downloadLink = await getRunDownloadUrl(event.data.tenant_id, result.runId);
      await resend.emails.send({
        from: "reports@iscop.ai",
        to: profile.email,
        subject: `${definition.name} is ready`,
        html: await render(ReportReadyEmail({ reportName: definition.name, downloadLink }))
      });
      return { emailed: true };
    });
    return result;
  }
);

export const analyticsFunctions = [calculateNightlyKpis, generateScheduledReport, generateReport];

