import { z } from "zod";

export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  uom: z.string().min(1).max(16).default("EA"),
  lead_time_days: z.number().int().min(0).default(0),
  safety_stock_days: z.number().int().min(0).default(7),
  min_order_qty: z.number().min(0).default(1),
  standard_cost_cents: z.number().int().min(0).default(0),
  currency_code: z.string().length(3).default("USD"),
  status: z.enum(["active", "inactive", "discontinued", "new"]).default("active"),
  attributes: z.record(z.string(), z.unknown()).default({})
});

export const UpdateProductSchema = CreateProductSchema.partial();