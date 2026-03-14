import { z } from "zod";

export const SupplierSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  country_code: z.string().length(2).optional(),
  currency_code: z.string().length(3).default("USD"),
  payment_terms_days: z.number().int().min(0).default(30),
  lead_time_days: z.number().int().min(0).default(14),
  min_order_value_cents: z.number().int().min(0).default(0),
  risk_rating: z.enum(["low", "medium", "high", "critical"]).default("low"),
  contact_email: z.string().email().optional()
});