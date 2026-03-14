import { getUserContext } from "@/lib/auth/server";
import { acknowledgeCapacitySubmission } from "@/lib/collaboration/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ supplierId: string; id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { supplierId, id } = await context.params;
    return Response.json(await acknowledgeCapacitySubmission(userContext.tenantId, supplierId, id));
  })(request);
}
