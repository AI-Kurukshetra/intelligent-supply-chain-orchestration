import { z } from "zod";

export const CreateSopCycleSchema = z.object({
  cycle_name: z.string().min(2).max(120),
  cycle_month: z.number().int().min(1).max(12),
  cycle_year: z.number().int().min(2024).max(2100)
});

export const SopActionSchema = z.object({
  sop_cycle_id: z.string().uuid().optional(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  owner_id: z.string().uuid().optional(),
  due_date: z.string().date().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium")
});

export const UpdateSopActionSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled", "overdue"]).optional(),
  owner_id: z.string().uuid().nullable().optional(),
  due_date: z.string().date().nullable().optional()
});

export const SupplierOrderResponseSchema = z.object({
  confirmed_qty: z.number().positive().optional(),
  confirmed_date: z.string().date().optional(),
  rejected: z.boolean().default(false),
  reason: z.string().max(1000).optional()
}).superRefine((value, ctx) => {
  if (value.rejected && !value.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "Reason is required when rejecting an order." });
  }
  if (!value.rejected && (!value.confirmed_qty || !value.confirmed_date)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmed_qty"], message: "Quantity and date are required when acknowledging an order." });
  }
});

export const CapacitySubmissionSchema = z.object({
  product_id: z.string().uuid(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  available_qty: z.number().nonnegative(),
  lead_time_days: z.number().int().min(0).max(365).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["draft", "submitted"]).default("draft")
});
