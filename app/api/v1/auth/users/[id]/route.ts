import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getTenantUserById, getUserContext, revokeUserSessions } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "users", "read");
    const { id } = await context.params;
    const tenantUser = await getTenantUserById(userContext.tenantId, id);

    return Response.json(tenantUser);
  })(request);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "users", "write");
    const { id } = await context.params;
    const body = (await req.json()) as {
      role?: "super_admin" | "planner" | "sop_manager" | "procurement" | "viewer" | "integration_admin" | "supplier";
      status?: "invited" | "active" | "inactive";
    };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: body.role, status: body.status })
      .eq("tenant_id", userContext.tenantId)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update user.");
    }

    return Response.json(data);
  })(request);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "users", "write");
    const { id } = await context.params;

    if (!id) {
      throw new ProblemDetail(400, "Bad Request", "User id is required.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ status: "inactive" })
      .eq("tenant_id", userContext.tenantId)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to deactivate user.");
    }

    await revokeUserSessions(id);
    const serviceClient = await createSupabaseServiceClient();
    await serviceClient.auth.admin.updateUserById(id, {
      user_metadata: {
        deactivated_at: new Date().toISOString()
      }
    });

    return Response.json({ success: true });
  })(request);
}