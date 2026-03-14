import { addBomLine, removeBomLine, writeAuditLog } from "@/lib/master-data/service";
import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const created = await addBomLine(userContext.tenantId, id, await req.json());
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "bom_line", entityId: created.id, action: "create", afterData: created });
    return Response.json(created, { status: 201 });
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const lineId = new URL(req.url).searchParams.get("line_id");
    if (!lineId) {
      throw new ProblemDetail(400, "Invalid Request", "line_id query parameter is required.");
    }
    const result = await removeBomLine(userContext.tenantId, id, lineId);
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "bom_line", entityId: lineId, action: "delete" });
    return Response.json(result);
  })(request);
}
