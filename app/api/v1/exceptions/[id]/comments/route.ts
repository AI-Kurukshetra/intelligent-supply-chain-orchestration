import { getUserContext } from "@/lib/auth/server";
import { addExceptionComment, listExceptionComments } from "@/lib/exceptions/orchestrator";
import { ExceptionCommentSchema } from "@/lib/validation/exceptions";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json({ data: await listExceptionComments(userContext.tenantId, id) });
  })(request);
}

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = ExceptionCommentSchema.parse(await req.json());
    return Response.json(await addExceptionComment(userContext.tenantId, id, user.id, payload.comment), { status: 201 });
  })(request);
}
