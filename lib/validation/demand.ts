import { z } from "zod";

export const ForecastRunSchema = z.object({
  product_id: z.string().uuid().optional(),
  product_ids: z.array(z.string().uuid()).max(500).optional(),
  facility_id: z.string().uuid().optional(),
  horizon_weeks: z.number().int().min(1).max(104).default(13)
});

export const ManualDemandHistorySchema = z.object({
  product_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  actual_qty: z.number().min(0),
  source: z.enum(["erp_sales", "manual", "pos", "ecommerce"]).default("manual")
});

export const ForecastOverrideSchema = z.object({
  product_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  statistical_qty: z.number().min(0),
  proposed_qty: z.number().min(0),
  reason: z.string().max(2000).optional(),
  reason_code: z.enum(["promotion", "new_customer", "lost_customer", "market_change", "other"])
});

export const OverrideDecisionSchema = z.object({
  reason: z.string().max(2000).optional(),
  rejection_reason: z.string().max(2000).optional()
});
