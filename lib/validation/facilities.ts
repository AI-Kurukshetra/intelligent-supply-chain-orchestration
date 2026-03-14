import { z } from "zod";

export const FacilitySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  type: z.enum(["plant", "warehouse", "distribution_center", "cross_dock"]),
  country_code: z.string().length(2).optional(),
  timezone: z.string().min(1).default("UTC"),
  address: z.record(z.string(), z.unknown()).default({})
});