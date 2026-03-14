import { getUserContext } from "@/lib/auth/server";
import { getForecastRun } from "@/lib/demand/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ runId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { runId } = await context.params;
    return Response.json(await getForecastRun(userContext.tenantId, runId));
  })(request);
}
