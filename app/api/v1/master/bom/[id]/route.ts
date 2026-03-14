import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { deleteBomHeader, getBomHeader, updateBomHeader, writeAuditLog } from "@/lib/master-data/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getBomHeader(userContext.tenantId, id));
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const updated = await updateBomHeader(userContext.tenantId, id, await req.json());
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "bom_header", entityId: id, action: "update", afterData: updated });
    return Response.json(updated);
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const result = await deleteBomHeader(userContext.tenantId, id);
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "bom_header", entityId: id, action: "delete" });
    return Response.json(result);
  })(request);
}