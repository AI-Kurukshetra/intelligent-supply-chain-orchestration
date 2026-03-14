import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createProduct, searchProducts, writeAuditLog } from "@/lib/master-data/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);

  return Response.json(
    await searchProducts({
      tenantId: context.tenantId,
      search: url.searchParams.get("search"),
      status: url.searchParams.get("status"),
      category: url.searchParams.get("category"),
      cursor: url.searchParams.get("cursor"),
      limit: Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100)
    })
  );
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "master_data", "write");
  const body = await request.json();
  const created = await createProduct(context.tenantId, body);
  await writeAuditLog({
    tenantId: context.tenantId,
    userId: user.id,
    entityType: "product",
    entityId: created.id,
    action: "create",
    afterData: created,
    userAgent: request.headers.get("user-agent")
  });
  return Response.json(created, { status: 201 });
});