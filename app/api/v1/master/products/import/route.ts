import { getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { parseProductWorkbook, queueLargeProductImport, upsertProductsInChunks, writeAuditLog } from "@/lib/master-data/service";
import { ProblemDetail, requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "master_data", "write");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ProblemDetail(400, "Invalid Upload", "A file upload is required.");
  }

  const parsed = await parseProductWorkbook(await file.arrayBuffer());
  if (parsed.rowCount > 500) {
    return Response.json(await queueLargeProductImport({ tenantId: context.tenantId, userId: user.id, file }));
  }

  const imported = await upsertProductsInChunks(context.tenantId, parsed.validRows);
  await writeAuditLog({
    tenantId: context.tenantId,
    userId: user.id,
    entityType: "product_import",
    action: "create",
    afterData: { imported, errors: parsed.errors.length },
    userAgent: request.headers.get("user-agent")
  });

  return Response.json({ imported, errors: parsed.errors });
});
