import { getUserContext } from "@/lib/auth/server";
import { addScenarioOverride } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await addScenarioOverride({ tenantId: userContext.tenantId, scenarioId: id, userId: user.id, payload: await req.json() }), { status: 201 });
  })(request);
}
