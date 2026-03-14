import { AnalyticsDeepDive } from "@/components/analytics/analytics-dashboard";
import { getUserContext } from "@/lib/auth/server";
import { getCurrentKpis, getKpiHistory } from "@/lib/analytics/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const userContext = await getUserContext(user.id);
  const current = await getCurrentKpis(userContext.tenantId);
  const historyEntries = await Promise.all(current.map(async (snapshot) => [String(snapshot.kpi_code), await getKpiHistory(userContext.tenantId, String(snapshot.kpi_code), null, null, "weekly")] as const));
  const history = Object.fromEntries(historyEntries);

  return <AnalyticsDeepDive initialCurrent={current as never[]} initialHistory={history} />;
}
