import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { adjustInventory } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "inventory", "write");
  return Response.json(
    await adjustInventory({ tenantId: context.tenantId, userId: user.id, payload: await request.json() }),
    { status: 201 }
  );
});
