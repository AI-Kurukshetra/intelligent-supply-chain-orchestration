import { inngest } from "@/lib/inngest/client";
import { ExceptionOrchestrator, generateAiRecommendation, sendExceptionAlertEmails } from "@/lib/exceptions/orchestrator";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };

type AlertEvent = { data: { exception_ids: string[]; tenant_id: string } };
type AiEvent = { data: { exception_id: string; tenant_id: string } };

export const detectExceptions = inngest.createFunction(
  { id: "detect-exceptions" },
  { cron: "*/15 * * * *" },
  async ({ step }: { step: Step }) => {
    const supabase = await createSupabaseServiceClient();
    const tenants = await step.run("load-tenants", async () => {
      const { data, error } = await supabase.from("organizations").select("id").eq("status", "active");
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string }>;
    });

    const orchestrator = new ExceptionOrchestrator();
    for (const tenant of tenants) {
      await step.run(`detect-${tenant.id}`, async () => orchestrator.runAll(tenant.id));
    }

    return { tenants_processed: tenants.length };
  }
);

export const sendExceptionAlerts = inngest.createFunction(
  { id: "send-exception-alerts" },
  { event: "exceptions/alerts.send" },
  async ({ event, step }: { event: AlertEvent; step: Step }) => {
    await step.run("send-alert-emails", async () => {
      await sendExceptionAlertEmails(event.data.tenant_id, event.data.exception_ids);
    });
    return { sent: event.data.exception_ids.length };
  }
);

export const generateAiRecommendations = inngest.createFunction(
  { id: "generate-ai-recommendations" },
  { event: "exceptions/ai.recommend" },
  async ({ event, step }: { event: AiEvent; step: Step }) => {
    const updated = await step.run("generate-recommendation", async () => generateAiRecommendation(event.data.tenant_id, event.data.exception_id));
    return { exception_id: updated.id };
  }
);

export const exceptionFunctions = [detectExceptions, sendExceptionAlerts, generateAiRecommendations];
