import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { inngest } from "@/lib/inngest/client";
import { triggerInventoryPolicyCalculation } from "@/lib/inventory/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "inventory", "write");
  const payload = await triggerInventoryPolicyCalculation({ tenantId: context.tenantId, payload: await request.json() });
  await inngest.send({ name: "inventory/policies.calculate", data: { tenant_id: context.tenantId, service_level_pct: payload.service_level_pct } });
  return Response.json({ status: "queued" }, { status: 202 });
});
