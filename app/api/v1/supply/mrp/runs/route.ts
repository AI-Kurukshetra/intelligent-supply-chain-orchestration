import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { inngest } from "@/lib/inngest/client";
import { createMrpRun, listMrpRuns } from "@/lib/supply/service";
import { MrpRunSchema } from "@/lib/validation/supply";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const planningCycleId = new URL(request.url).searchParams.get("planning_cycle_id");
  return Response.json({ data: await listMrpRuns(context.tenantId, planningCycleId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "supply", "write");
  const payload = MrpRunSchema.parse(await request.json());
  const run = await createMrpRun(context.tenantId, user.id, payload);
  await inngest.send({ name: "supply/mrp.run", data: { run_id: run.id, tenant_id: context.tenantId, planning_cycle_id: payload.planning_cycle_id } });
  return Response.json({ run_id: run.id, status: "queued" }, { status: 202 });
});
