import { InviteUserDialog } from "@/components/auth/invite-user-dialog";
import { UsersTable } from "@/components/auth/users-table";
import { getUserContext } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsUsersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Not authenticated.</section>;
  }

  const context = await getUserContext(user.id);
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <InviteUserDialog />
      <UsersTable users={data ?? []} />
    </div>
  );
}