import { getUserContext } from "@/lib/auth/server";
import { suppressException } from "@/lib/exceptions/orchestrator";
import { ExceptionSuppressSchema } from "@/lib/validation/exceptions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = ExceptionSuppressSchema.parse(await req.json());
    return Response.json(await suppressException(userContext.tenantId, id, payload.suppressed_until));
  })(request);
}
