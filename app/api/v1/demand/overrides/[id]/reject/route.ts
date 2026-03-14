import { getUserContext } from "@/lib/auth/server";
import { rejectOverride } from "@/lib/demand/service";
import { OverrideDecisionSchema } from "@/lib/validation/demand";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    if (!["planner", "sop_manager", "super_admin"].includes(userContext.role)) {
      throw new ProblemDetail(403, "Forbidden", "Only planners or S&OP managers can reject overrides.");
    }
    const { id } = await context.params;
    const body = OverrideDecisionSchema.parse(await req.json());
    return Response.json(await rejectOverride(userContext.tenantId, user.id, id, body.rejection_reason ?? body.reason));
  })(request);
}
