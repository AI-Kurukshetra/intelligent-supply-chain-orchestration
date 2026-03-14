import { getUserContext } from "@/lib/auth/server";
import { getRunDownloadUrl } from "@/lib/analytics/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ runId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { runId } = await context.params;
    const url = await getRunDownloadUrl(userContext.tenantId, runId);
    return Response.redirect(url);
  })(request);
}
