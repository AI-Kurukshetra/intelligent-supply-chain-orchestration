import { getUserContext } from "@/lib/auth/server";
import { getDashboardData } from "@/lib/analytics/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ type: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { type } = await context.params;
    return Response.json(await getDashboardData(userContext.tenantId, type));
  })(request);
}
