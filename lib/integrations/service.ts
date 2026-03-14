import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { generateText, streamText } from "ai";
import { openai as openaiModel } from "@ai-sdk/openai";

import { getCurrentKpis } from "@/lib/analytics/service";
import { aiPrompts } from "@/lib/ai/prompts";
import { parseAndMapCsv } from "@/lib/integrations/connectors/csv-upload";
import { RestApiConnector, type RestConnectorConfig } from "@/lib/integrations/connectors/rest-api";
import { applyMappings, type FieldMapping } from "@/lib/integrations/field-mapping";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProblemDetail } from "@/lib/utils/errors";

const supportedObjectTypes = ["products", "demand_history", "inventory_positions", "open_supply_orders", "suppliers"] as const;

type ConnectorRow = {
  id: string;
  connector_type: string;
  name: string;
  status: string;
  config_encrypted: Record<string, unknown>;
  sync_schedule_cron: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
};

type SyncJobSummary = { connector_id: string; records_processed: number; created_at: string; status: string };
type MappingRow = FieldMapping & { object_type: string };

function getEncryptionKey() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "iscop-default-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptConfig(config: Record<string, unknown>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: encrypted.toString("base64") };
}

export function decryptConfig(value: Record<string, unknown> | null | undefined) {
  if (!value) return {};
  const iv = Buffer.from(String(value.iv ?? ""), "base64");
  const tag = Buffer.from(String(value.tag ?? ""), "base64");
  const encrypted = Buffer.from(String(value.data ?? ""), "base64");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as Record<string, unknown>;
}

export async function listConnectors(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [connectorsResult, syncJobsResult] = await Promise.all([
    supabase.from("connectors").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("sync_jobs").select("connector_id, records_processed, created_at, status").eq("tenant_id", tenantId).order("created_at", { ascending: false })
  ]);
  if (connectorsResult.error || syncJobsResult.error) throw new ProblemDetail(500, "Connector Query Failed", connectorsResult.error?.message ?? syncJobsResult.error?.message ?? "Unable to load connectors.");
  return ((connectorsResult.data ?? []) as ConnectorRow[]).map((connector: ConnectorRow) => ({
    ...connector,
    latest_job: ((syncJobsResult.data ?? []) as SyncJobSummary[]).find((job: SyncJobSummary) => job.connector_id === connector.id) ?? null
  }));
}

export async function createConnector(tenantId: string, payload: { connector_type: string; name: string; config: Record<string, unknown>; sync_schedule_cron?: string | null }) {
  const supabase = await createSupabaseServiceClient();
  const encrypted = encryptConfig(payload.config);
  const { data, error } = await supabase.from("connectors").insert({ tenant_id: tenantId, connector_type: payload.connector_type, name: payload.name, status: "inactive", config_encrypted: encrypted, sync_schedule_cron: payload.sync_schedule_cron ?? null }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Connector Create Failed", error?.message ?? "Unable to create connector.");
  return data;
}

export async function getConnector(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const [connectorResult, jobsResult] = await Promise.all([
    supabase.from("connectors").select("*").eq("tenant_id", tenantId).eq("id", id).single(),
    supabase.from("sync_jobs").select("*").eq("tenant_id", tenantId).eq("connector_id", id).order("created_at", { ascending: false }).limit(20)
  ]);
  if (connectorResult.error || !connectorResult.data) throw new ProblemDetail(404, "Not Found", connectorResult.error?.message ?? "Connector not found.");
  return { ...connectorResult.data, config: decryptConfig(connectorResult.data.config_encrypted as Record<string, unknown>), jobs: jobsResult.data ?? [], healthy: connectorResult.data.last_sync_status !== "error" };
}

export async function updateConnector(tenantId: string, id: string, payload: { name: string; config: Record<string, unknown>; sync_schedule_cron?: string | null; status?: string }) {
  const supabase = await createSupabaseServiceClient();
  const encrypted = encryptConfig(payload.config);
  const { data, error } = await supabase.from("connectors").update({ name: payload.name, config_encrypted: encrypted, sync_schedule_cron: payload.sync_schedule_cron ?? null, status: payload.status ?? "inactive" }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Connector Update Failed", error?.message ?? "Unable to update connector.");
  return data;
}

export async function disableConnector(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("connectors").update({ status: "inactive" }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Connector Disable Failed", error?.message ?? "Unable to disable connector.");
  return data;
}

export async function testConnector(tenantId: string, id: string) {
  const connector = await getConnector(tenantId, id);
  if (connector.connector_type === "csv_upload") {
    return { success: true, message: "CSV connector is ready for uploads." };
  }
  const client = new RestApiConnector();
  const success = await client.testConnection(connector.config as RestConnectorConfig);
  return { success, message: success ? "Connection successful." : "Connection failed." };
}

export async function listMappings(tenantId: string, connectorId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("connector_mappings").select("*").eq("tenant_id", tenantId).eq("connector_id", connectorId).order("created_at", { ascending: true });
  if (error) throw new ProblemDetail(500, "Mapping Query Failed", error.message);
  return (data ?? []) as MappingRow[];
}

export async function upsertMapping(tenantId: string, connectorId: string, payload: FieldMapping & { object_type: string }) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("connector_mappings").upsert({ id: payload.id, tenant_id: tenantId, connector_id: connectorId, object_type: payload.object_type, source_field: payload.source_field, target_field: payload.target_field, transform_type: payload.transform_type, transform_config: payload.transform_config ?? {} }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Mapping Save Failed", error?.message ?? "Unable to save mapping.");
  return data;
}

export async function deleteMapping(tenantId: string, connectorId: string, mappingId: string) {
  const supabase = await createSupabaseServiceClient();
  const { error } = await supabase.from("connector_mappings").delete().eq("tenant_id", tenantId).eq("connector_id", connectorId).eq("id", mappingId);
  if (error) throw new ProblemDetail(500, "Mapping Delete Failed", error.message);
  return { success: true };
}

export async function listWebhooks(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [subscriptions, deliveries] = await Promise.all([
    supabase.from("webhook_subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("webhook_deliveries").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50)
  ]);
  if (subscriptions.error || deliveries.error) throw new ProblemDetail(500, "Webhook Query Failed", subscriptions.error?.message ?? deliveries.error?.message ?? "Unable to load webhooks.");
  return { subscriptions: subscriptions.data ?? [], deliveries: deliveries.data ?? [] };
}

export async function upsertWebhook(tenantId: string, payload: { id?: string; name: string; target_url: string; event_types: string[]; secret: string; is_active?: boolean }) {
  const supabase = await createSupabaseServiceClient();
  const secretHash = createHash("sha256").update(payload.secret).digest("hex");
  const { data, error } = await supabase.from("webhook_subscriptions").upsert({ id: payload.id, tenant_id: tenantId, name: payload.name, target_url: payload.target_url, event_types: payload.event_types, secret_hash: secretHash, is_active: payload.is_active ?? true }).select("*").single();
  if (error || !data) throw new ProblemDetail(500, "Webhook Save Failed", error?.message ?? "Unable to save webhook subscription.");
  return data;
}

export async function deleteWebhook(tenantId: string, id: string) {
  const supabase = await createSupabaseServiceClient();
  const { error } = await supabase.from("webhook_subscriptions").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw new ProblemDetail(500, "Webhook Delete Failed", error.message);
  return { success: true };
}

export async function replayWebhookDelivery(tenantId: string, webhookId: string, deliveryId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("webhook_deliveries").select("*").eq("tenant_id", tenantId).eq("webhook_subscription_id", webhookId).eq("id", deliveryId).single();
  if (error || !data) throw new ProblemDetail(404, "Not Found", error?.message ?? "Webhook delivery not found.");
  await supabase.from("webhook_deliveries").update({ attempt_count: Number(data.attempt_count ?? 0) + 1 }).eq("id", deliveryId);
  return { replayed: true };
}

async function upsertTargetRecords(tenantId: string, objectType: string, records: Record<string, unknown>[]) {
  const supabase = await createSupabaseServiceClient();
  if (!supportedObjectTypes.includes(objectType as (typeof supportedObjectTypes)[number])) {
    throw new ProblemDetail(400, "Unsupported Object Type", `Unsupported object type ${objectType}.`);
  }
  const normalized = records.map((record) => ({ tenant_id: tenantId, ...record }));
  const { error } = await (supabase as any).from(objectType).upsert(normalized);
  if (error) throw new ProblemDetail(500, "Sync Upsert Failed", error.message);
}

export async function runConnectorSync(input: { tenantId: string; connectorId: string; objectTypes: string[]; csvBuffer?: Buffer | null }) {
  const connector = await getConnector(input.tenantId, input.connectorId);
  const mappings = await listMappings(input.tenantId, input.connectorId);
  const supabase = await createSupabaseServiceClient();
  const results: Array<Record<string, unknown>> = [];

  for (const objectType of input.objectTypes) {
    const job = await supabase.from("sync_jobs").insert({ tenant_id: input.tenantId, connector_id: input.connectorId, object_type: objectType, status: "running", started_at: new Date().toISOString() }).select("*").single();
    try {
      const objectMappings = mappings.filter((mapping: MappingRow) => mapping.object_type === objectType) as MappingRow[];
      let records: Record<string, unknown>[] = [];
      let errorCount = 0;
      let errors: unknown[] = [];
      if (connector.connector_type === "csv_upload") {
        if (!input.csvBuffer) throw new ProblemDetail(400, "Missing CSV", "CSV connector sync requires an uploaded file.");
        const parsed = parseAndMapCsv(input.csvBuffer, objectMappings, objectType);
        records = parsed.valid;
        errorCount = parsed.errors.length;
        errors = parsed.errors;
      } else {
        const rest = new RestApiConnector();
        const synced = await rest.syncObjectType(connector.config as RestConnectorConfig, objectType, objectMappings);
        records = synced.records;
      }
      await upsertTargetRecords(input.tenantId, objectType, records.map((record) => applyMappings(record, [])));
      await supabase.from("sync_jobs").update({ status: "completed", records_processed: records.length, error_count: errorCount, errors, completed_at: new Date().toISOString() }).eq("id", String(job.data?.id ?? ""));
      results.push({ object_type: objectType, records_processed: records.length, error_count: errorCount });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Sync failed.";
      await supabase.from("sync_jobs").update({ status: "failed", error_count: 1, errors: [{ message: detail }], completed_at: new Date().toISOString() }).eq("id", String(job.data?.id ?? ""));
      results.push({ object_type: objectType, records_processed: 0, error_count: 1, message: detail });
    }
  }

  await supabase.from("connectors").update({ last_sync_at: new Date().toISOString(), last_sync_status: results.some((result: Record<string, unknown>) => Number(result.error_count ?? 0) > 0) ? "error" : "success", status: "active" }).eq("id", input.connectorId).eq("tenant_id", input.tenantId);
  return results;
}

export async function listSyncJobs(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase.from("sync_jobs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new ProblemDetail(500, "Sync Jobs Query Failed", error.message);
  return data ?? [];
}

export async function getRecommendationStream(tenantId: string, exceptionId: string) {
  const supabase = await createSupabaseServiceClient();
  const [exceptionResult, positionsResult, ordersResult] = await Promise.all([
    supabase.from("exceptions").select("*").eq("tenant_id", tenantId).eq("id", exceptionId).single(),
    supabase.from("inventory_positions").select("product_id, on_hand_qty, reserved_qty, safety_stock_qty").eq("tenant_id", tenantId).limit(10),
    supabase.from("planned_orders").select("status, quantity, due_date").eq("tenant_id", tenantId).order("due_date", { ascending: true }).limit(10)
  ]);
  if (exceptionResult.error || !exceptionResult.data) throw new ProblemDetail(404, "Not Found", exceptionResult.error?.message ?? "Exception not found.");
  return streamText({
    model: openaiModel("gpt-4o"),
    system: aiPrompts.recommendation,
    prompt: JSON.stringify({ exception: exceptionResult.data, inventory_levels: positionsResult.data ?? [], supply_plan: ordersResult.data ?? [] })
  });
}

export async function answerNaturalLanguageQuery(tenantId: string, question: string) {
  const supabase = await createSupabaseServiceClient();
  const [kpis, stockouts, suppliers] = await Promise.all([
    getCurrentKpis(tenantId),
    supabase.from("exceptions").select("title, severity, entity_name, detected_at").eq("tenant_id", tenantId).in("exception_type", ["EX001", "EX005"]).limit(10),
    supabase.from("supplier_scorecards").select("supplier_id, otif_pct, grade").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10)
  ]);
  const schemaOverview = {
    tables: ["products", "suppliers", "facilities", "planned_orders", "inventory_positions", "exceptions", "kpi_snapshots"],
    notes: "All queries are tenant-scoped and read-only."
  };
  const result = await generateText({
    model: openaiModel("gpt-4o"),
    system: `${aiPrompts.query}\nSchema: ${JSON.stringify(schemaOverview)}\nCurrent KPI summary: ${JSON.stringify(kpis.slice(0, 8))}`,
    prompt: JSON.stringify({ question, data: { stockout_risks: stockouts.data ?? [], supplier_otif: suppliers.data ?? [] } })
  });
  return {
    answer: result.text,
    data: {
      stockout_risks: stockouts.data ?? [],
      supplier_otif: suppliers.data ?? [],
      kpis: kpis.slice(0, 8)
    }
  };
}

