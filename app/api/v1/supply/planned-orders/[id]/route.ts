import { getUserContext } from "@/lib/auth/server";
import { getPlannedOrder, updatePlannedOrder } from "@/lib/supply/service";
import { requirePermission } from "@/lib/auth/permissions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getPlannedOrder(userContext.tenantId, id));
  })(request);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "supply", "write");
    const { id } = await context.params;
    return Response.json(await updatePlannedOrder(userContext.tenantId, id, await req.json()));
  })(request);
}
