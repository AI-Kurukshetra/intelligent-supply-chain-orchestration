import { getUserContext } from "@/lib/auth/server";
import { approveOverride } from "@/lib/demand/service";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    if (!["planner", "sop_manager", "super_admin"].includes(userContext.role)) {
      throw new ProblemDetail(403, "Forbidden", "Only planners or S&OP managers can approve overrides.");
    }
    const { id } = await context.params;
    return Response.json(await approveOverride(userContext.tenantId, user.id, id));
  })(request);
}
