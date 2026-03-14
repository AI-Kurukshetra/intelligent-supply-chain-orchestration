import { getUserContext } from "@/lib/auth/server";
import { listWebhooks, upsertWebhook } from "@/lib/integrations/service";
import { WebhookSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  return Response.json(await listWebhooks(userContext.tenantId));
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = WebhookSchema.parse(await request.json());
  return Response.json(await upsertWebhook(userContext.tenantId, payload), { status: 201 });
});
