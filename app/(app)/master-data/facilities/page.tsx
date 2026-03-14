import { FacilitiesPage, type Facility } from "@/components/master-data/facilities-page";
import { getUserContext } from "@/lib/auth/server";
import { listEntity } from "@/lib/master-data/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MasterFacilitiesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view facilities.</section>;
  }

  const context = await getUserContext(user.id);
  const facilities = await listEntity("facilities", context.tenantId);

  return <FacilitiesPage facilities={facilities as Facility[]} />;
}
