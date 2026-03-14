import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createDemandHistoryEntry, listDemandHistory } from "@/lib/demand/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);

  return Response.json(
    await listDemandHistory({
      tenantId: context.tenantId,
      productId: url.searchParams.get("product_id"),
      facilityId: url.searchParams.get("facility_id"),
      cursor: url.searchParams.get("cursor"),
      limit: Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100)
    })
  );
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "demand", "write");
  return Response.json(await createDemandHistoryEntry(context.tenantId, await request.json()), { status: 201 });
});
