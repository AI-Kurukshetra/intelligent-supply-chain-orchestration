import { getUserContext } from "@/lib/auth/server";
import { buildProductsExport, writeAuditLog } from "@/lib/master-data/service";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  const buffer = await buildProductsExport(context.tenantId);
  await writeAuditLog({
    tenantId: context.tenantId,
    userId: user.id,
    entityType: "product_export",
    action: "export",
    afterData: { size: buffer.byteLength },
    userAgent: request.headers.get("user-agent")
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="products.xlsx"'
    }
  });
});
