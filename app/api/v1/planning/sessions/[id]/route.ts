import { getUserContext } from "@/lib/auth/server";
import { getPlanningSession, listPlanningCells } from "@/lib/planning/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const [session, cells] = await Promise.all([
      getPlanningSession(userContext.tenantId, id),
      listPlanningCells(userContext.tenantId, id)
    ]);
    return Response.json({ session, locked_cells: cells.filter((cell) => cell.locked_by), participants: [] });
  })(request);
}
