import { getUserContext } from "@/lib/auth/server";
import { listInventoryPositions } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);
  const data = await listInventoryPositions({
    tenantId: context.tenantId,
    facilityId: url.searchParams.get("facility_id"),
    belowReorderPoint: url.searchParams.get("below_reorder_point") === "true",
    search: url.searchParams.get("search")
  });

  return Response.json({ data });
});
