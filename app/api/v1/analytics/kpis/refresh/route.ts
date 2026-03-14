import { getUserContext } from "@/lib/auth/server";
import { getDefaultPeriod, refreshKpisForTenant } from "@/lib/analytics/service";
import { RefreshKpisSchema } from "@/lib/validation/analytics";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const parsed = RefreshKpisSchema.parse(await request.json().catch(() => ({})));
  const period = {
    ...getDefaultPeriod(),
    ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined))
  };
  return Response.json({ data: await refreshKpisForTenant(userContext.tenantId, period) });
});
