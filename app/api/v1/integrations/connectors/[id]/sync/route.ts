import { getUserContext } from "@/lib/auth/server";
import { inngest } from "@/lib/inngest/client";
import { SyncTriggerSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = SyncTriggerSchema.parse(await req.json());
    await inngest.send({ name: "integration/sync.run", data: { connector_id: id, tenant_id: userContext.tenantId, object_types: payload.object_types } });
    return Response.json({ connector_id: id, status: "queued" });
  })(request);
}
