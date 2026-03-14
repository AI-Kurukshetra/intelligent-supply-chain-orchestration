import { getUserContext } from "@/lib/auth/server";
import { compareScenarios } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const body = (await req.json()) as { other_scenario_id: string };
    return Response.json(await compareScenarios(userContext.tenantId, id, body.other_scenario_id));
  })(request);
}
