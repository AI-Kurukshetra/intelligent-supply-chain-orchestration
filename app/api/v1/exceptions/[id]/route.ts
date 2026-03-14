import { getUserContext } from "@/lib/auth/server";
import { getExceptionDetail } from "@/lib/exceptions/orchestrator";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getExceptionDetail(userContext.tenantId, id));
  })(request);
}
