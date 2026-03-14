import { getUserContext } from "@/lib/auth/server";
import { bulkResolveExceptions } from "@/lib/exceptions/orchestrator";
import { ExceptionBulkResolveSchema } from "@/lib/validation/exceptions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  return Response.json({ data: await bulkResolveExceptions(context.tenantId, user.id, ExceptionBulkResolveSchema.parse(await request.json())) });
});
