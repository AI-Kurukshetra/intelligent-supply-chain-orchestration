import { PlanningScenarios } from "@/components/planning/planning-scenarios";
import { getUserContext } from "@/lib/auth/server";
import { listScenarios } from "@/lib/planning/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PlanningScenariosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view planning scenarios.</section>;
  }

  const context = await getUserContext(user.id);
  const scenarios = await listScenarios(context.tenantId, null);
  return <PlanningScenarios scenarios={scenarios} />;
}
