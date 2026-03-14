import { SuppliersPage, type Supplier } from "@/components/master-data/suppliers-page";
import { getUserContext } from "@/lib/auth/server";
import { listEntity } from "@/lib/master-data/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MasterSuppliersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view suppliers.</section>;
  }

  const context = await getUserContext(user.id);
  const suppliers = await listEntity("suppliers", context.tenantId);

  return <SuppliersPage suppliers={suppliers as Supplier[]} />;
}
