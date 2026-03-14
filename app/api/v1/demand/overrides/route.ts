import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createOverride, listOverrides } from "@/lib/demand/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);
  return Response.json({
    data: await listOverrides({
      tenantId: context.tenantId,
      status: url.searchParams.get("status"),
      productId: url.searchParams.get("product_id"),
      periodFrom: url.searchParams.get("period_from"),
      periodTo: url.searchParams.get("period_to")
    })
  });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "demand", "write");
  return Response.json(await createOverride(context.tenantId, user.id, await request.json()), { status: 201 });
});
