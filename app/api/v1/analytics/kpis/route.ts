import { getUserContext } from "@/lib/auth/server";
import { getCurrentKpis } from "@/lib/analytics/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  return Response.json({ data: await getCurrentKpis(userContext.tenantId) });
});
