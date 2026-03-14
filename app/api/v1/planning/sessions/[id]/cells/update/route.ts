import { getUserContext } from "@/lib/auth/server";
import { inngest } from "@/lib/inngest/client";
import { PlanningConflictError, setCellLock, upsertPlanningCell } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = (await req.json()) as {
      action?: "lock" | "unlock";
      cell_id?: string;
      entity_type?: string;
      entity_id?: string;
      period_start?: string;
      field_name?: string;
      value?: unknown;
      original_value?: unknown;
      version?: number;
      reason?: string;
    };

    if (payload.action === "lock" && payload.cell_id) {
      return Response.json(await setCellLock({ tenantId: userContext.tenantId, sessionId: id, cellId: payload.cell_id, userId: user.id }));
    }
    if (payload.action === "unlock" && payload.cell_id) {
      return Response.json(await setCellLock({ tenantId: userContext.tenantId, sessionId: id, cellId: payload.cell_id, userId: null }));
    }

    try {
      const updated = await upsertPlanningCell({
        tenantId: userContext.tenantId,
        sessionId: id,
        userId: user.id,
        payload: {
          cell_id: payload.cell_id,
          entity_type: String(payload.entity_type ?? "demand"),
          entity_id: String(payload.entity_id ?? ""),
          period_start: String(payload.period_start ?? ""),
          field_name: String(payload.field_name ?? "value"),
          value: payload.value as never,
          original_value: payload.original_value as never,
          version: Number(payload.version ?? 0),
          reason: payload.reason ?? null
        }
      });

      await inngest.send({ name: "planning/impact.calculate", data: { session_id: id, change_id: updated.id, tenant_id: userContext.tenantId } });
      return Response.json({
        id: updated.id,
        sessionId: updated.session_id,
        entityType: updated.entity_type,
        entityId: updated.entity_id,
        fieldName: updated.field_name,
        periodStart: updated.period_start,
        currentValue: updated.current_value,
        originalValue: updated.original_value,
        version: updated.version,
        lockedBy: updated.locked_by,
        lockedAt: updated.locked_at,
        lastModifiedBy: updated.last_modified_by,
        lastModifiedAt: updated.last_modified_at
      });
    } catch (error) {
      if (error instanceof PlanningConflictError) {
        return Response.json(
          {
            type: "https://iscop.ai/errors/409",
            title: "Conflict",
            status: 409,
            detail: "Cell version mismatch.",
            current_version: error.currentVersion,
            current_value: error.currentValue
          },
          { status: 409 }
        );
      }
      throw error;
    }
  })(request);
}
