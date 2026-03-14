import { z } from "zod";

export const InventoryPolicySchema = z.object({
  product_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  service_level_pct: z.number().min(0).max(100).default(95),
  lead_time_days: z.number().int().min(0).default(14),
  holding_cost_pct: z.number().min(0).default(25),
  ordering_cost_cents: z.number().int().min(0).default(50000)
});

export const InventoryAdjustmentSchema = z.object({
  product_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  transaction_type: z.enum([
    "receipt",
    "issue",
    "adjustment",
    "transfer_in",
    "transfer_out",
    "cycle_count",
    "return"
  ]),
  quantity: z.number(),
  reason: z.string().max(500).optional()
});

export const InventoryPolicyTriggerSchema = z.object({
  service_level_pct: z.number().min(85).max(99.9).optional()
});

export const InventoryPolicyOverrideSchema = z.object({
  service_level_pct: z.number().min(85).max(99.9),
  lead_time_days: z.number().int().min(1),
  holding_cost_pct: z.number().min(0),
  ordering_cost_cents: z.number().int().min(0),
  calculated_safety_stock: z.number().min(0),
  calculated_rop: z.number().min(0),
  calculated_eoq: z.number().min(0)
});
