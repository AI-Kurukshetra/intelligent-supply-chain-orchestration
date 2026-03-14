import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { createPlanningCycle, listPlanningCycles } from "@/lib/supply/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const url = new URL(request.url);
  return Response.json(await listPlanningCycles(context.tenantId, url.searchParams.get("cursor"), Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100)));
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "supply", "write");
  return Response.json(await createPlanningCycle(context.tenantId, user.id, await request.json()), { status: 201 });
});
