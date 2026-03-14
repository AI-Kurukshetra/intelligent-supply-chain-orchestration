import { getUserContext } from "@/lib/auth/server";
import { listSopCycles, createSopCycle } from "@/lib/collaboration/service";
import { CreateSopCycleSchema } from "@/lib/validation/sop";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  return Response.json({ data: await listSopCycles(userContext.tenantId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = CreateSopCycleSchema.parse(await request.json());
  return Response.json(await createSopCycle(userContext.tenantId, payload), { status: 201 });
});
