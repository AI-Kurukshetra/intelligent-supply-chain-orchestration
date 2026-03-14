import { SopWorkspace, type CycleDetail } from "@/components/collaboration/planner-collaboration";
import { getUserContext } from "@/lib/auth/server";
import { getSopCycleDetail, listSopCycles } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SopPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const userContext = await getUserContext(user.id);
  const cycles = await listSopCycles(userContext.tenantId);
  const firstCycleId = cycles[0]?.id as string | undefined;
  const detail = firstCycleId ? await getSopCycleDetail(userContext.tenantId, firstCycleId) : null;

  return <SopWorkspace cycles={cycles as Array<Record<string, unknown>>} initialDetail={detail as CycleDetail | null} />;
}
