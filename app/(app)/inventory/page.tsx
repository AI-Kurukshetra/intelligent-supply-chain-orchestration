import { InventoryPositionsPage } from "@/components/inventory/inventory-positions-page";
import { getUserContext } from "@/lib/auth/server";
import { listInventoryPositions } from "@/lib/inventory/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view inventory positions.</section>;
  }

  const context = await getUserContext(user.id);
  const rows = await listInventoryPositions({ tenantId: context.tenantId });
  return <InventoryPositionsPage rows={rows} />;
}
