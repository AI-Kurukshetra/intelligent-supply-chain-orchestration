import { z } from "zod";

export const PlanningCycleSchema = z.object({
  cycle_name: z.string().min(1),
  cycle_type: z.enum(["mrp", "sop", "adhoc"]),
  horizon_start: z.string().date(),
  horizon_end: z.string().date()
});

export const PlanningCycleStatusSchema = z.object({
  status: z.enum(["open", "running", "review", "approved", "locked"])
});

export const MrpRunSchema = z.object({
  planning_cycle_id: z.string().uuid()
});

export const PlannedOrderSchema = z.object({
  planning_cycle_id: z.string().uuid(),
  product_id: z.string().uuid(),
  facility_id: z.string().uuid(),
  order_type: z.enum(["production", "purchase", "transfer"]),
  quantity: z.number().positive(),
  planned_start_date: z.string().date(),
  planned_end_date: z.string().date(),
  due_date: z.string().date(),
  supplier_id: z.string().uuid().optional(),
  firm_planned: z.boolean().default(false),
  status: z.enum(["planned", "firmed", "released", "completed", "cancelled"]).default("planned"),
  uom: z.string().default("EA"),
  pegging: z.array(z.record(z.string(), z.unknown())).default([])
});

export const PlannedOrderUpdateSchema = z.object({
  quantity: z.number().positive().optional(),
  planned_start_date: z.string().date().optional(),
  planned_end_date: z.string().date().optional(),
  due_date: z.string().date().optional(),
  status: z.enum(["planned", "firmed", "released", "completed", "cancelled"]).optional()
});

export const BulkFirmOrdersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500)
});

