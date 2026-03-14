import { getSupplierContext, respondToSupplierOrder } from "@/lib/collaboration/service";
import { SupplierOrderResponseSchema } from "@/lib/validation/sop";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  return withErrorHandler(async (req) => {
    const user = await requireAuth(req);
    const supplierContext = await getSupplierContext(user.id);
    const { id } = await context.params;
    const payload = SupplierOrderResponseSchema.parse(await req.json());
    return Response.json(
      await respondToSupplierOrder({ tenantId: supplierContext.tenantId, supplierId: supplierContext.supplierId, orderId: id, payload })
    );
  })(request);
}
