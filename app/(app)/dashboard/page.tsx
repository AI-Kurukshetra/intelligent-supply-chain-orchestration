import { ExecutiveDashboard } from "@/components/analytics/analytics-dashboard";
import { getUserContext } from "@/lib/auth/server";
import { getDashboardData } from "@/lib/analytics/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const userContext = await getUserContext(user.id);
  const data = await getDashboardData(userContext.tenantId, "executive");

  return <ExecutiveDashboard initialKpis={data.kpis as never[]} initialExceptions={data.exceptions as never[]} cycles={data.cycles as never[]} />;
}
