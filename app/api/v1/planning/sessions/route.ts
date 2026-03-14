import { getUserContext } from "@/lib/auth/server";
import { createPlanningSession, listPlanningSessions } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const planningCycleId = new URL(request.url).searchParams.get("planning_cycle_id");
  return Response.json({ data: await listPlanningSessions(context.tenantId, planningCycleId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const payload = (await request.json()) as { planning_cycle_id: string; description?: string | null };
  return Response.json(await createPlanningSession(context.tenantId, user.id, payload), { status: 201 });
});
