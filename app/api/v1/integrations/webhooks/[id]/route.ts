import { getUserContext } from "@/lib/auth/server";
import { deleteWebhook, listWebhooks, replayWebhookDelivery, upsertWebhook } from "@/lib/integrations/service";
import { WebhookSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string; did?: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const data = await listWebhooks(userContext.tenantId);
    return Response.json({ subscription: data.subscriptions.find((item: { id: string }) => item.id === id) ?? null, deliveries: data.deliveries.filter((item: { webhook_subscription_id: string }) => item.webhook_subscription_id === id) });
  })(request);
}

export async function PUT(request: Request) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const payload = WebhookSchema.parse(await req.json());
    return Response.json(await upsertWebhook(userContext.tenantId, payload));
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await deleteWebhook(userContext.tenantId, id));
  })(request);
}
