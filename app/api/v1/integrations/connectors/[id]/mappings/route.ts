import { getUserContext } from "@/lib/auth/server";
import { deleteMapping, listMappings, upsertMapping } from "@/lib/integrations/service";
import { MappingSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    return Response.json({ data: await listMappings(userContext.tenantId, id) });
  })(request);
}

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const payload = MappingSchema.parse(await req.json());
    return Response.json(await upsertMapping(userContext.tenantId, id, payload), { status: 201 });
  })(request);
}

export async function PUT(request: Request, context: RouteContext) {
  return POST(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const userContext = await getUserContext(user.id);
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const mappingId = searchParams.get("mapping_id");
    if (!mappingId) throw new Error("mapping_id is required.");
    return Response.json(await deleteMapping(userContext.tenantId, id, mappingId));
  })(request);
}
