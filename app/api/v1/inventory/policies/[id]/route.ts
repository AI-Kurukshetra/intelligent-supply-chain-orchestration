import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { overrideInventoryPolicy } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "inventory", "write");
    const { id } = await context.params;
    return Response.json(await overrideInventoryPolicy({ tenantId: userContext.tenantId, id, payload: await req.json() }));
  })(request);
}
