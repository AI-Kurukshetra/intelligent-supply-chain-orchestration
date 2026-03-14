import { getUserContext } from "@/lib/auth/server";
import { getPlannerSupplierSummary, listCapacitySubmissions } from "@/lib/collaboration/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplier_id");
  const status = searchParams.get("status");
  const period = searchParams.get("period");
  const [suppliers, submissions] = await Promise.all([
    getPlannerSupplierSummary(userContext.tenantId),
    listCapacitySubmissions(userContext.tenantId, supplierId, status, period)
  ]);
  return Response.json({ suppliers, submissions });
});
