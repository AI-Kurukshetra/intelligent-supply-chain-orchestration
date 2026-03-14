import { ExceptionTrendsPage } from "@/components/exceptions/exception-trends-page";
import { getUserContext } from "@/lib/auth/server";
import { getExceptionTrendData } from "@/lib/exceptions/orchestrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ExceptionTrendsRoute() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view exception trends.</section>;
  }
  const context = await getUserContext(user.id);
  const data = await getExceptionTrendData(context.tenantId);
  return <ExceptionTrendsPage data={data} />;
}
