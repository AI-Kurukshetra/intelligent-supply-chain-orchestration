import { z } from "zod";

export const ExceptionUpdateSchema = z.object({
  status: z.enum(["open", "acknowledged", "in_progress", "resolved", "suppressed"]),
  resolution_notes: z.string().max(4000).optional()
});

export const ExceptionResolveSchema = z.object({
  resolution_notes: z.string().max(4000).optional(),
  resolution_action: z.string().max(500).optional()
});

export const ExceptionSuppressSchema = z.object({
  suppressed_until: z.string().datetime()
});

export const ExceptionBulkResolveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  resolution_notes: z.string().max(4000).optional(),
  resolution_action: z.string().max(500).optional()
});

export const ExceptionCommentSchema = z.object({
  comment: z.string().min(1).max(4000)
});
