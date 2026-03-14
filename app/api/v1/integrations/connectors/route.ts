import { getUserContext } from "@/lib/auth/server";
import { createConnector, listConnectors, listSyncJobs } from "@/lib/integrations/service";
import { ConnectorSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const [connectors, syncJobs] = await Promise.all([listConnectors(userContext.tenantId), listSyncJobs(userContext.tenantId)]);
  return Response.json({ data: connectors, sync_jobs: syncJobs });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = ConnectorSchema.parse(await request.json());
  return Response.json(await createConnector(userContext.tenantId, payload), { status: 201 });
});
