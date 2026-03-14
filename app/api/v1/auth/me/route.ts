import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, getTenantOrganization } from "@/lib/auth/server";
import type { Json } from "@/lib/supabase/types";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const profile = await getCurrentProfile(user.id);
  const tenant = await getTenantOrganization(profile.tenant_id);

  return Response.json({
    user,
    profile,
    tenant,
    roles: [profile.role]
  });
});

export const PUT = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as {
    first_name?: string | null;
    last_name?: string | null;
    preferences?: Record<string, unknown>;
  };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      preferences: (body.preferences ?? {}) as Json
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update profile.");
  }

  return Response.json(data);
});
