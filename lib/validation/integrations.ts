import { z } from "zod";

export const ConnectorSchema = z.object({
  connector_type: z.enum(["csv_upload", "generic_rest", "sap_odata"]),
  name: z.string().min(2).max(120),
  config: z.record(z.string(), z.unknown()),
  sync_schedule_cron: z.string().optional()
});

export const MappingSchema = z.object({
  id: z.string().uuid().optional(),
  object_type: z.enum(["products", "demand_history", "inventory_positions", "open_supply_orders", "suppliers"]),
  source_field: z.string().min(1),
  target_field: z.string().min(1),
  transform_type: z.enum(["direct", "lookup", "formula", "constant", "conditional"]),
  transform_config: z.record(z.string(), z.unknown()).optional()
});

export const WebhookSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  target_url: z.string().url(),
  event_types: z.array(z.string()).min(1),
  secret: z.string().min(8),
  is_active: z.boolean().optional()
});

export const SyncTriggerSchema = z.object({
  object_types: z.array(z.enum(["products", "demand_history", "inventory_positions", "open_supply_orders", "suppliers"]))
});

export const AiRecommendSchema = z.object({ exception_id: z.string().uuid() });
export const AiQuerySchema = z.object({ question: z.string().min(3).max(1000) });
