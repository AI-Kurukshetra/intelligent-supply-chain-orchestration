import { SupplierPlannerPage, type CapacityGapRow, type CapacitySubmissionRow, type SupplierSummary } from "@/components/collaboration/planner-collaboration";
import { getUserContext } from "@/lib/auth/server";
import { getPlannerSupplierSummary, getSupplierCapacityGap, listCapacitySubmissions } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CollaborationSuppliersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const userContext = await getUserContext(user.id);
  const suppliers = await getPlannerSupplierSummary(userContext.tenantId);
  const firstSupplierId = suppliers[0]?.id as string | undefined;
  const [submissions, initialGap] = await Promise.all([
    listCapacitySubmissions(userContext.tenantId),
    firstSupplierId ? getSupplierCapacityGap(userContext.tenantId, firstSupplierId) : Promise.resolve([])
  ]);

  return <SupplierPlannerPage suppliers={suppliers as SupplierSummary[]} submissionsBySupplier={submissions as CapacitySubmissionRow[]} initialGap={initialGap as CapacityGapRow[]} />;
}
