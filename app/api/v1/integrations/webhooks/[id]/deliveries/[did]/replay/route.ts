import { getUserContext } from "@/lib/auth/server";
import { replayWebhookDelivery } from "@/lib/integrations/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string; did: string }> };
export const runtime = "nodejs";
export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id, did } = await context.params;
    return Response.json(await replayWebhookDelivery(userContext.tenantId, id, did));
  })(request);
}
