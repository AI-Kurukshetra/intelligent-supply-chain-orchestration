import { getUserContext } from "@/lib/auth/server";
import { createScenario, listScenarios } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const planningCycleId = new URL(request.url).searchParams.get("planning_cycle_id");
  return Response.json({ data: await listScenarios(context.tenantId, planningCycleId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  return Response.json(await createScenario({ tenantId: context.tenantId, userId: user.id, payload: await request.json() }), { status: 201 });
});
