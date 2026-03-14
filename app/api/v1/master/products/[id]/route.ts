import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductDetail, softDeleteProduct, updateProduct, writeAuditLog } from "@/lib/master-data/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await getProductDetail(userContext.tenantId, id));
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data: beforeState } = await supabase.from("products").select("*").eq("tenant_id", userContext.tenantId).eq("id", id).single();
    const updated = await updateProduct(userContext.tenantId, id, await req.json());
    await writeAuditLog({
      tenantId: userContext.tenantId,
      userId: user.id,
      entityType: "product",
      entityId: id,
      action: "update",
      beforeData: beforeState ?? null,
      afterData: updated,
      userAgent: req.headers.get("user-agent")
    });
    return Response.json(updated);
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const deleted = await softDeleteProduct(userContext.tenantId, id);
    await writeAuditLog({
      tenantId: userContext.tenantId,
      userId: user.id,
      entityType: "product",
      entityId: id,
      action: "delete",
      afterData: deleted,
      userAgent: req.headers.get("user-agent")
    });
    return Response.json({ success: true });
  })(request);
}