import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { softDeleteEntity, updateEntity, writeAuditLog } from "@/lib/master-data/service";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("suppliers").select("*").eq("tenant_id", userContext.tenantId).eq("id", id).single();
    if (error || !data) {
      throw new ProblemDetail(404, "Not Found", error?.message ?? "Supplier not found.");
    }
    return Response.json(data);
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    const updated = await updateEntity("suppliers", userContext.tenantId, id, await req.json());
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "supplier", entityId: id, action: "update", afterData: updated });
    return Response.json(updated);
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "master_data", "write");
    const { id } = await context.params;
    await softDeleteEntity("suppliers", userContext.tenantId, id);
    await writeAuditLog({ tenantId: userContext.tenantId, userId: user.id, entityType: "supplier", entityId: id, action: "delete" });
    return Response.json({ success: true });
  })(request);
}
