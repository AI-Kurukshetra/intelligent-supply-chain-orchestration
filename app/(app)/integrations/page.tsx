import { IntegrationsWorkspace } from "@/components/integrations/integrations-workspace";
import { getUserContext } from "@/lib/auth/server";
import { listConnectors, listSyncJobs } from "@/lib/integrations/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const userContext = await getUserContext(user.id);
  const [connectors, syncJobs] = await Promise.all([
    listConnectors(userContext.tenantId),
    listSyncJobs(userContext.tenantId)
  ]);

  return <IntegrationsWorkspace connectors={connectors as never[]} syncJobs={syncJobs as never[]} />;
}
