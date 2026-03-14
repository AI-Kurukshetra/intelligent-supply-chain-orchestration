import { z } from "zod";

export const RefreshKpisSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  granularity: z.enum(["daily", "weekly", "monthly"]).optional()
});

export const ReportDefinitionSchema = z.object({
  name: z.string().min(2).max(120),
  report_type: z.enum(["executive", "demand", "supply", "inventory", "supplier", "custom"]),
  config: z.object({
    kpi_codes: z.array(z.string()).min(1),
    schedule: z.string().optional(),
    filters: z.record(z.string(), z.unknown()).optional()
  }),
  output_format: z.enum(["pdf", "excel"])
});
