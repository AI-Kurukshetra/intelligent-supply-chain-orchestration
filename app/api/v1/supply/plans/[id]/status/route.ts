import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { updatePlanningCycleStatus } from "@/lib/supply/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "supply", "write");
    const { id } = await context.params;
    return Response.json(await updatePlanningCycleStatus(userContext.tenantId, id, await req.json()));
  })(request);
}
