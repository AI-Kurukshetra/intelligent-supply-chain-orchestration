import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createPlannedOrder, listPlannedOrders } from "@/lib/supply/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);

  return Response.json(
    await listPlannedOrders({
      tenantId: context.tenantId,
      planningCycleId: url.searchParams.get("planning_cycle_id"),
      type: url.searchParams.get("type"),
      status: url.searchParams.get("status"),
      productId: url.searchParams.get("product_id"),
      facilityId: url.searchParams.get("facility_id"),
      dateFrom: url.searchParams.get("date_from"),
      dateTo: url.searchParams.get("date_to"),
      cursor: url.searchParams.get("cursor"),
      limit: Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100)
    })
  );
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "supply", "write");
  return Response.json(await createPlannedOrder(context.tenantId, await request.json()), { status: 201 });
});
