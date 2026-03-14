import { render } from "@react-email/components";

import { ReportReadyEmail } from "@/lib/email/templates/ReportReadyEmail";
import { inngest } from "@/lib/inngest/client";
import { resend } from "@/lib/email/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getRunDownloadUrl } from "@/lib/analytics/service";
import { runConnectorSync } from "@/lib/integrations/service";

export const syncConnector = inngest.createFunction(
  { id: "integration-sync-connector" },
  { event: "integration/sync.run" },
  async ({ event, step }: { event: { data: { connector_id: string; tenant_id: string; object_types: string[] } }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    return step.run("sync-connector", async () => runConnectorSync({ tenantId: event.data.tenant_id, connectorId: event.data.connector_id, objectTypes: event.data.object_types }));
  }
);

export const dispatchWebhooks = inngest.createFunction(
  { id: "integration-dispatch-webhooks" },
  { event: "integration/webhook.dispatch" },
  async ({ event, step }: { event: { data: { tenant_id: string; event_type: string; payload: Record<string, unknown> } }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    return step.run("dispatch-webhooks", async () => {
      const supabase = await createSupabaseServiceClient();
      const { data: hooks } = await supabase.from("webhook_subscriptions").select("*").eq("tenant_id", event.data.tenant_id).eq("is_active", true);
      for (const hook of hooks ?? []) {
        if (!(hook.event_types ?? []).includes(event.data.event_type)) continue;
        let responseStatus = 0;
        let responseBody = "";
        let attempt = 0;
        while (attempt < 5) {
          attempt += 1;
          try {
            const response = await fetch(String(hook.target_url), { method: "POST", headers: { "Content-Type": "application/json", "x-iscop-signature": String(hook.secret_hash) }, body: JSON.stringify(event.data.payload) });
            responseStatus = response.status;
            responseBody = await response.text();
            if (response.ok) break;
          } catch (error) {
            responseBody = error instanceof Error ? error.message : "Dispatch failed.";
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
        await supabase.from("webhook_deliveries").insert({ tenant_id: event.data.tenant_id, webhook_subscription_id: hook.id, event_type: event.data.event_type, payload: event.data.payload, response_status: responseStatus, response_body: responseBody, attempt_count: attempt, delivered_at: responseStatus >= 200 && responseStatus < 300 ? new Date().toISOString() : null });
      }
      return { dispatched: hooks?.length ?? 0 };
    });
  }
);

export const integrationFunctions = [syncConnector, dispatchWebhooks];
