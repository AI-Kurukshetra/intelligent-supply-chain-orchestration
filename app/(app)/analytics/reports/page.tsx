import { ReportsWorkspace } from "@/components/analytics/analytics-dashboard";
import { getUserContext } from "@/lib/auth/server";
import { listReportDefinitions, listReportRuns } from "@/lib/analytics/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const userContext = await getUserContext(user.id);
  const reports = await listReportDefinitions(userContext.tenantId);
  const runsByReport = Object.fromEntries(await Promise.all(reports.map(async (report: { id: string }) => [String(report.id), await listReportRuns(userContext.tenantId, String(report.id))] as const)));

  return <ReportsWorkspace reports={reports as Array<Record<string, unknown>>} runsByReport={runsByReport} />;
}

