import { getUserContext } from "@/lib/auth/server";
import { createReportDefinition, listReportDefinitions } from "@/lib/analytics/service";
import { ReportDefinitionSchema } from "@/lib/validation/analytics";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  return Response.json({ data: await listReportDefinitions(userContext.tenantId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = ReportDefinitionSchema.parse(await request.json());
  return Response.json(await createReportDefinition(userContext.tenantId, user.id, payload), { status: 201 });
});
