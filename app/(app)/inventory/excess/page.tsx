import { InventoryExcessPage } from "@/components/inventory/inventory-excess-page";
import { getUserContext } from "@/lib/auth/server";
import { listExcessObsolete } from "@/lib/inventory/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InventoryExcessRoute() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view excess inventory.</section>;
  }

  const context = await getUserContext(user.id);
  const rows = await listExcessObsolete(context.tenantId);
  return <InventoryExcessPage rows={rows} />;
}
