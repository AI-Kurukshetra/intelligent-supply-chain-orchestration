import { getUserContext } from "@/lib/auth/server";
import { disableConnector, getConnector, updateConnector } from "@/lib/integrations/service";
import { ConnectorSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getConnector(userContext.tenantId, id));
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = ConnectorSchema.parse(await req.json());
    return Response.json(await updateConnector(userContext.tenantId, id, payload));
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await disableConnector(userContext.tenantId, id));
  })(request);
}
