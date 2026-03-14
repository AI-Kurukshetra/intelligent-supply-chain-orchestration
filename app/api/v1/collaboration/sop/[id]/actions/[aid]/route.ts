import { getUserContext } from "@/lib/auth/server";
import { updateSopAction } from "@/lib/collaboration/service";
import { UpdateSopActionSchema } from "@/lib/validation/sop";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string; aid: string }> };

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id, aid } = await context.params;
    const payload = UpdateSopActionSchema.parse(await req.json());
    return Response.json(await updateSopAction(userContext.tenantId, id, aid, payload));
  })(request);
}
