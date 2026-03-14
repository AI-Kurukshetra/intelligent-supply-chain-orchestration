import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createForecastRun, listForecastRuns, resolveForecastRunProducts } from "@/lib/demand/service";
import { inngest } from "@/lib/inngest/client";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  return Response.json({ data: await listForecastRuns(context.tenantId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "demand", "write");

  const resolved = await resolveForecastRunProducts(context.tenantId, await request.json());
  if (!resolved.facilityId) {
    throw new ProblemDetail(400, "Invalid Request", "facility_id is required to trigger a forecast run.");
  }

  const run = await createForecastRun({
    tenantId: context.tenantId,
    userId: user.id,
    facilityId: resolved.facilityId,
    productIds: resolved.productIds,
    horizonWeeks: resolved.horizonWeeks
  });

  await inngest.send({
    name: "demand/forecast.run",
    data: {
      run_id: run.id,
      tenant_id: context.tenantId,
      product_ids: resolved.productIds,
      facility_id: resolved.facilityId,
      horizon_weeks: resolved.horizonWeeks
    }
  });

  return Response.json({ run_id: run.id, status: "queued" }, { status: 202 });
});
