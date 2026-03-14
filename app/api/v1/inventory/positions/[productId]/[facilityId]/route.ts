import { getUserContext } from "@/lib/auth/server";
import { getInventoryPositionDetail } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ productId: string; facilityId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { productId, facilityId } = await context.params;
    return Response.json(await getInventoryPositionDetail(userContext.tenantId, productId, facilityId));
  })(request);
}
