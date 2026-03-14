import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createEntity, listEntity, writeAuditLog } from "@/lib/master-data/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  return Response.json({ data: await listEntity("facilities", context.tenantId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "master_data", "write");
  const created = await createEntity("facilities", context.tenantId, await request.json());
  await writeAuditLog({ tenantId: context.tenantId, userId: user.id, entityType: "facility", entityId: created.id, action: "create", afterData: created });
  return Response.json(created, { status: 201 });
});