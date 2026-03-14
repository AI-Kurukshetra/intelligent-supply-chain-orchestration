import { getUserContext } from "@/lib/auth/server";
import { createSopAction } from "@/lib/collaboration/service";
import { SopActionSchema } from "@/lib/validation/sop";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = SopActionSchema.omit({ sop_cycle_id: true }).parse(await req.json());
    return Response.json(await createSopAction(userContext.tenantId, id, payload), { status: 201 });
  })(request);
}
