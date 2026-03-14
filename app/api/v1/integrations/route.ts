import { getUserContext } from "@/lib/auth/server";
import { listConnectors, listSyncJobs, listWebhooks } from "@/lib/integrations/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const [connectors, syncJobs, webhooks] = await Promise.all([
    listConnectors(userContext.tenantId),
    listSyncJobs(userContext.tenantId),
    listWebhooks(userContext.tenantId)
  ]);
  return Response.json({ connectors, sync_jobs: syncJobs, webhooks });
});
