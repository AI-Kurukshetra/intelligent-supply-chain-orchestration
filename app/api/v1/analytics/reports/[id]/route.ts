import { getUserContext } from "@/lib/auth/server";
import { deleteReportDefinition, getReportDefinition, updateReportDefinition } from "@/lib/analytics/service";
import { ReportDefinitionSchema } from "@/lib/validation/analytics";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getReportDefinition(userContext.tenantId, id));
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = ReportDefinitionSchema.parse(await req.json());
    return Response.json(await updateReportDefinition(userContext.tenantId, id, payload));
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await deleteReportDefinition(userContext.tenantId, id));
  })(request);
}
