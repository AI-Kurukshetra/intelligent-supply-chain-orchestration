import { getUserContext } from "@/lib/auth/server";
import { resolveException } from "@/lib/exceptions/orchestrator";
import { ExceptionResolveSchema } from "@/lib/validation/exceptions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json(await resolveException(userContext.tenantId, id, user.id, ExceptionResolveSchema.parse(await req.json())));
  })(request);
}
