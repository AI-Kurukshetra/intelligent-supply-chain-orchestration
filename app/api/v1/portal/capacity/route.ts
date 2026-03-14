import { getSupplierContext } from "@/lib/collaboration/service";
import { listCapacitySubmissions, upsertCapacitySubmission } from "@/lib/collaboration/service";
import { CapacitySubmissionSchema } from "@/lib/validation/sop";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getSupplierContext(user.id);
  return Response.json({ data: await listCapacitySubmissions(context.tenantId, context.supplierId) });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getSupplierContext(user.id);
  const payload = CapacitySubmissionSchema.parse(await request.json());
  return Response.json(await upsertCapacitySubmission({ tenantId: context.tenantId, supplierId: context.supplierId, userId: user.id, payload }), { status: 201 });
});
