import { getUserContext } from "@/lib/auth/server";
import { getSupplierCapacityGap } from "@/lib/collaboration/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ supplierId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { supplierId } = await context.params;
    return Response.json({ data: await getSupplierCapacityGap(userContext.tenantId, supplierId) });
  })(request);
}
