import { getUserContext } from "@/lib/auth/server";
import { listExcessObsolete } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  return Response.json({ data: await listExcessObsolete(context.tenantId) });
});
