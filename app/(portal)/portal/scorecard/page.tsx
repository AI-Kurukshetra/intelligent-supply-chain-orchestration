import { SupplierScorecardPage, type ScorecardRecord } from "@/components/collaboration/planner-collaboration";
import { getSupplierContext, listSupplierScorecards } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplierScorecardRoutePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const context = await getSupplierContext(user.id);
  const scorecards = await listSupplierScorecards(context.tenantId, context.supplierId);
  return <SupplierScorecardPage scorecards={scorecards as ScorecardRecord[]} />;
}
