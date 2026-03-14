import { ApiKeysTable } from "@/components/auth/api-keys-table";
import { CreateApiKeyDialog } from "@/components/auth/create-api-key-dialog";
import { getUserContext } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsApiKeysPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Not authenticated.</section>;
  }

  const context = await getUserContext(user.id);
  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id, tenant_id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <CreateApiKeyDialog />
      <ApiKeysTable keys={data ?? []} />
    </div>
  );
}