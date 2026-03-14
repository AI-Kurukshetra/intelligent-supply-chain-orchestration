import { activateBom, writeAuditLog } from "@/lib/master-data/service";
import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const activated = await activateBom(userContext.tenantId, id);
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "bom_header", entityId: id, action: "update", afterData: activated });
    return Response.json(activated);
  })(request);
}