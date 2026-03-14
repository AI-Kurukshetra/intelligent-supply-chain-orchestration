import { getUserContext } from "@/lib/auth/server";
import { getKpiHistory } from "@/lib/analytics/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ kpiCode: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { searchParams } = new URL(req.url);
    const { kpiCode } = await context.params;
    return Response.json({
      data: await getKpiHistory(
        userContext.tenantId,
        kpiCode,
        searchParams.get("from"),
        searchParams.get("to"),
        searchParams.get("granularity")
      )
    });
  })(request);
}
