import { getUserContext } from "@/lib/auth/server";
import { getExceptionAnalyticsSummary, listExceptions } from "@/lib/exceptions/orchestrator";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);
  if (url.pathname.endsWith("/analytics/summary")) {
    return Response.json(await getExceptionAnalyticsSummary(context.tenantId));
  }
  return Response.json({
    data: await listExceptions({
      tenantId: context.tenantId,
      type: url.searchParams.get("type"),
      severity: url.searchParams.get("severity"),
      status: url.searchParams.get("status"),
      entityId: url.searchParams.get("entity_id")
    })
  });
});
