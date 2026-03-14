import { z } from "zod";

export const BomHeaderSchema = z.object({
  product_id: z.string().uuid(),
  version: z.string().min(1).default("1.0"),
  status: z.enum(["draft", "active", "superseded"]).default("draft"),
  effective_from: z.string().date().optional(),
  effective_to: z.string().date().optional()
});

export const BomLineSchema = z.object({
  bom_header_id: z.string().uuid(),
  parent_product_id: z.string().uuid(),
  component_product_id: z.string().uuid(),
  quantity: z.number().positive(),
  uom: z.string().min(1).default("EA"),
  scrap_factor_pct: z.number().min(0).max(100).default(0),
  is_phantom: z.boolean().default(false),
  position_number: z.number().int().optional()
});