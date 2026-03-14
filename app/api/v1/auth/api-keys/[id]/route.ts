import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    requirePermission(userContext.role, "api_keys", "write");

    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("tenant_id", userContext.tenantId)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  })(request);
}