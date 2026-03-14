import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { bulkFirmPlannedOrders } from "@/lib/supply/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "supply", "write");
  return Response.json({ data: await bulkFirmPlannedOrders(context.tenantId, await request.json()) });
});
