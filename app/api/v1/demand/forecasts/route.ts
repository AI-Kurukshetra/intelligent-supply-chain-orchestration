import { getUserContext } from "@/lib/auth/server";
import { listForecasts, listForecastRuns } from "@/lib/demand/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);

  if (url.pathname.endsWith("/runs")) {
    return Response.json({ data: await listForecastRuns(context.tenantId) });
  }

  return Response.json({
    data: await listForecasts({
      tenantId: context.tenantId,
      productId: url.searchParams.get("product_id"),
      facilityId: url.searchParams.get("facility_id"),
      periodFrom: url.searchParams.get("period_from"),
      periodTo: url.searchParams.get("period_to"),
      runId: url.searchParams.get("run_id")
    })
  });
});
