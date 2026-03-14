import { createHash, randomBytes } from "node:crypto";

import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "api_keys", "read");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Response.json({ data: data ?? [] });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "api_keys", "write");

  const body = (await request.json()) as { name: string; scopes: string[]; expires_at?: string | null };
  const rawKey = `iscop_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 8);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      tenant_id: context.tenantId,
      user_id: user.id,
      name: body.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: body.scopes ?? [],
      expires_at: body.expires_at ?? null
    })
    .select("id, name, key_prefix, scopes, expires_at, revoked_at, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create API key.");
  }

  return Response.json({ api_key: rawKey, record: data }, { status: 201 });
});