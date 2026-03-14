import ExcelJS from "exceljs";

import { inngest } from "@/lib/inngest/client";
import { createWorkbookBuffer } from "@/lib/utils/excel";
import { ProblemDetail } from "@/lib/utils/errors";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { CreateProductSchema, UpdateProductSchema } from "@/lib/validation/products";
import { SupplierSchema } from "@/lib/validation/suppliers";
import { FacilitySchema } from "@/lib/validation/facilities";
import { BomHeaderSchema, BomLineSchema } from "@/lib/validation/bom";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
export type FacilityRow = Database["public"]["Tables"]["facilities"]["Row"];

export const PRODUCT_IMPORT_HEADERS = [
  "sku",
  "name",
  "description",
  "category",
  "uom",
  "lead_time_days",
  "safety_stock_days",
  "min_order_qty",
  "standard_cost_cents",
  "currency_code",
  "status"
] as const;

export async function writeAuditLog(input: {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId?: string;
  action: "create" | "update" | "delete" | "login" | "export";
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  userAgent?: string | null;
}) {
  const serviceClient = await createSupabaseServiceClient();
  const { error } = await serviceClient.from("audit_log").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    user_agent: input.userAgent ?? null
  });

  if (error) {
    throw new ProblemDetail(500, "Audit Log Error", error.message);
  }
}

export async function searchProducts(input: {
  tenantId: string;
  search?: string | null;
  status?: string | null;
  category?: string | null;
  cursor?: string | null;
  limit: number;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (input.search) {
    query = query.textSearch("search_vector", input.search, { type: "websearch" });
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.category) {
    query = query.eq("category", input.category);
  }

  if (input.cursor) {
    query = query.lt("created_at", input.cursor);
  }

  const { data, error } = await query.limit(input.limit + 1);
  if (error) {
    throw new ProblemDetail(500, "Product Query Failed", error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > input.limit;
  const sliced = hasMore ? rows.slice(0, input.limit) : rows;

  return {
    data: sliced,
    next_cursor: hasMore ? sliced.at(-1)?.created_at ?? null : null,
    has_more: hasMore
  };
}

export async function createProduct(tenantId: string, payload: unknown) {
  const parsed = CreateProductSchema.parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...parsed, tenant_id: tenantId })
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Product Creation Failed", error?.message ?? "Unable to create product.");
  }

  return data;
}

export async function updateProduct(tenantId: string, productId: string, payload: unknown) {
  const parsed = UpdateProductSchema.parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update(parsed)
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Product Update Failed", error?.message ?? "Unable to update product.");
  }

  return data;
}

export async function getProductDetail(tenantId: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: product, error: productError }, { data: bomHeaders, error: bomError }, { count: supplierCount, error: supplierError }] = await Promise.all([
    supabase.from("products").select("*").eq("tenant_id", tenantId).eq("id", productId).single(),
    supabase
      .from("bom_headers")
      .select("id, version, status, effective_from, effective_to")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("capacity_submissions")
      .select("supplier_id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("status", "acknowledged")
  ]);

  if (productError || !product) {
    throw new ProblemDetail(404, "Not Found", productError?.message ?? "Product not found.");
  }

  if (bomError) {
    throw new ProblemDetail(500, "BOM Query Failed", bomError.message);
  }

  if (supplierError) {
    throw new ProblemDetail(500, "Supplier Count Failed", supplierError.message);
  }

  return {
    product,
    active_bom_header: bomHeaders?.[0] ?? null,
    approved_supplier_count: supplierCount ?? 0
  };
}

export async function softDeleteProduct(tenantId: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Product Delete Failed", error?.message ?? "Unable to soft delete product.");
  }

  return data;
}

export async function explodeBom(tenantId: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("explode_bom", {
    p_tenant_id: tenantId,
    p_product_id: productId
  });

  if (error) {
    throw new ProblemDetail(500, "BOM Explosion Failed", error.message);
  }

  return data ?? [];
}

export async function createEntity<T>(table: "suppliers" | "facilities", tenantId: string, payload: unknown) {
  const schema = table === "suppliers" ? SupplierSchema : FacilitySchema;
  const parsed = schema.parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).insert({ ...parsed, tenant_id: tenantId }).select("*").single();

  if (error || !data) {
    throw new ProblemDetail(500, `${table} creation failed`, error?.message ?? `Unable to create ${table}.`);
  }

  return data;
}

export async function listEntity(table: "suppliers" | "facilities", tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });

  if (error) {
    throw new ProblemDetail(500, `${table} query failed`, error.message);
  }

  return data ?? [];
}

export async function updateEntity(table: "suppliers" | "facilities", tenantId: string, id: string, payload: unknown) {
  const schema = table === "suppliers" ? SupplierSchema.partial() : FacilitySchema.partial();
  const parsed = schema.parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).update(parsed).eq("tenant_id", tenantId).eq("id", id).select("*").single();

  if (error || !data) {
    throw new ProblemDetail(500, `${table} update failed`, error?.message ?? `Unable to update ${table}.`);
  }

  return data;
}

export async function softDeleteEntity(table: "suppliers" | "facilities", tenantId: string, id: string) {
  const supabase = await createSupabaseServerClient();
  const payload = table === "suppliers" ? { deleted_at: new Date().toISOString(), status: "inactive" } : { status: "inactive" };
  const { error } = await supabase.from(table).update(payload).eq("tenant_id", tenantId).eq("id", id);

  if (error) {
    throw new ProblemDetail(500, `${table} delete failed`, error.message);
  }

  return { success: true };
}

export async function listBomHeaders(tenantId: string, productId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("bom_headers").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (productId) {
    query = query.eq("product_id", productId);
  }
  const { data, error } = await query;
  if (error) {
    throw new ProblemDetail(500, "BOM query failed", error.message);
  }
  return data ?? [];
}

export async function createBomHeader(tenantId: string, payload: unknown) {
  const parsed = BomHeaderSchema.parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("bom_headers").insert({ ...parsed, tenant_id: tenantId, status: "draft" }).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "BOM creation failed", error?.message ?? "Unable to create BOM header.");
  }
  return data;
}

export async function getBomHeader(tenantId: string, bomId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: header, error: headerError } = await supabase.from("bom_headers").select("*").eq("tenant_id", tenantId).eq("id", bomId).single();
  if (headerError || !header) {
    throw new ProblemDetail(404, "Not Found", headerError?.message ?? "BOM header not found.");
  }
  const { data: lines, error: linesError } = await supabase.from("bom_lines").select("*").eq("tenant_id", tenantId).eq("bom_header_id", bomId).order("position_number", { ascending: true });
  if (linesError) {
    throw new ProblemDetail(500, "BOM lines failed", linesError.message);
  }
  return { header, lines: lines ?? [] };
}

export async function updateBomHeader(tenantId: string, bomId: string, payload: unknown) {
  const parsed = BomHeaderSchema.partial().parse(payload);
  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase.from("bom_headers").select("status").eq("tenant_id", tenantId).eq("id", bomId).single();
  if (currentError || !current) {
    throw new ProblemDetail(404, "Not Found", currentError?.message ?? "BOM header not found.");
  }
  if (current.status !== "draft") {
    throw new ProblemDetail(409, "Conflict", "Only draft BOMs can be updated.");
  }
  const { data, error } = await supabase.from("bom_headers").update(parsed).eq("tenant_id", tenantId).eq("id", bomId).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "BOM update failed", error?.message ?? "Unable to update BOM header.");
  }
  return data;
}

export async function deleteBomHeader(tenantId: string, bomId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase.from("bom_headers").select("status").eq("tenant_id", tenantId).eq("id", bomId).single();
  if (currentError || !current) {
    throw new ProblemDetail(404, "Not Found", currentError?.message ?? "BOM header not found.");
  }
  if (current.status !== "draft") {
    throw new ProblemDetail(409, "Conflict", "Only draft BOMs can be deleted.");
  }
  const { error } = await supabase.from("bom_headers").delete().eq("tenant_id", tenantId).eq("id", bomId);
  if (error) {
    throw new ProblemDetail(500, "BOM delete failed", error.message);
  }
  return { success: true };
}

export async function addBomLine(tenantId: string, bomId: string, payload: unknown) {
  const parsed = BomLineSchema.parse(payload);
  if (parsed.parent_product_id === parsed.component_product_id) {
    throw new ProblemDetail(400, "Invalid BOM", "Circular BOM references are not allowed.");
  }
  const supabase = await createSupabaseServerClient();
  const { data: existingExplosion, error: explosionError } = await supabase.rpc("explode_bom", {
    p_tenant_id: tenantId,
    p_product_id: parsed.component_product_id
  });
  if (explosionError) {
    throw new ProblemDetail(500, "Circularity Check Failed", explosionError.message);
  }
  const hasCycle = (existingExplosion ?? []).some((row: { component_product_id: string }) => row.component_product_id === parsed.parent_product_id);
  if (hasCycle) {
    throw new ProblemDetail(400, "Invalid BOM", "This component would create a circular reference.");
  }
  const { data, error } = await supabase.from("bom_lines").insert({ ...parsed, tenant_id: tenantId, bom_header_id: bomId }).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "BOM line create failed", error?.message ?? "Unable to add BOM line.");
  }
  return data;
}

export async function removeBomLine(tenantId: string, bomId: string, lineId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bom_lines").delete().eq("tenant_id", tenantId).eq("bom_header_id", bomId).eq("id", lineId);
  if (error) {
    throw new ProblemDetail(500, "BOM line delete failed", error.message);
  }
  return { success: true };
}

export async function activateBom(tenantId: string, bomId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: header, error: headerError } = await supabase.from("bom_headers").select("*").eq("tenant_id", tenantId).eq("id", bomId).single();
  if (headerError || !header) {
    throw new ProblemDetail(404, "Not Found", headerError?.message ?? "BOM header not found.");
  }
  const { data: lines, error: linesError } = await supabase.from("bom_lines").select("id").eq("tenant_id", tenantId).eq("bom_header_id", bomId);
  if (linesError) {
    throw new ProblemDetail(500, "BOM validation failed", linesError.message);
  }
  if (!lines || lines.length === 0) {
    throw new ProblemDetail(400, "Invalid BOM", "A BOM must contain at least one component line before activation.");
  }
  const { error: supersedeError } = await supabase
    .from("bom_headers")
    .update({ status: "superseded" })
    .eq("tenant_id", tenantId)
    .eq("product_id", header.product_id)
    .eq("status", "active")
    .neq("id", bomId);
  if (supersedeError) {
    throw new ProblemDetail(500, "BOM activation failed", supersedeError.message);
  }
  const { data, error } = await supabase.from("bom_headers").update({ status: "active" }).eq("tenant_id", tenantId).eq("id", bomId).select("*").single();
  if (error || !data) {
    throw new ProblemDetail(500, "BOM activation failed", error?.message ?? "Unable to activate BOM.");
  }
  return data;
}

export async function parseProductWorkbook(fileBuffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.getWorksheet("Sheet1") ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new ProblemDetail(400, "Import Error", "Workbook must contain Sheet1.");
  }

  const headerRow = worksheet.getRow(1);
  const headers = PRODUCT_IMPORT_HEADERS.map((_, index) => String(headerRow.getCell(index + 1).value ?? "").trim());
  const matchesTemplate = PRODUCT_IMPORT_HEADERS.every((header, index) => headers[index] === header);
  if (!matchesTemplate) {
    throw new ProblemDetail(400, "Import Error", "Sheet1 columns do not match the required template.");
  }

  const validRows: Array<Record<string, unknown>> = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
    if (rowNumber === 1) {
      return;
    }
    const raw = {
      sku: String(row.getCell(1).value ?? "").trim(),
      name: String(row.getCell(2).value ?? "").trim(),
      description: String(row.getCell(3).value ?? "").trim() || undefined,
      category: String(row.getCell(4).value ?? "").trim() || undefined,
      uom: String(row.getCell(5).value ?? "").trim() || "EA",
      lead_time_days: Number(row.getCell(6).value ?? 0),
      safety_stock_days: Number(row.getCell(7).value ?? 7),
      min_order_qty: Number(row.getCell(8).value ?? 1),
      standard_cost_cents: Number(row.getCell(9).value ?? 0),
      currency_code: String(row.getCell(10).value ?? "USD").trim() || "USD",
      status: String(row.getCell(11).value ?? "active").trim() || "active"
    };

    const parsed = CreateProductSchema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push({ row: rowNumber, field: issue.path.join("."), message: issue.message });
      });
      return;
    }

    validRows.push(parsed.data);
  });

  return { validRows, errors, rowCount: worksheet.rowCount - 1 };
}

export async function upsertProductsInChunks(tenantId: string, rows: Array<Record<string, unknown>>) {
  const supabase = await createSupabaseServerClient();
  let imported = 0;

  for (let index = 0; index < rows.length; index += 100) {
    const chunk = rows.slice(index, index + 100).map((row) => ({ ...row, tenant_id: tenantId }));
    const { error, data } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "tenant_id,sku" })
      .select("id");
    if (error) {
      throw new ProblemDetail(500, "Import Failed", error.message);
    }
    imported += data?.length ?? chunk.length;
  }

  return imported;
}

export async function queueLargeProductImport(input: { tenantId: string; userId: string; file: File }) {
  const serviceClient = await createSupabaseServiceClient();
  const jobId = crypto.randomUUID();
  const objectPath = `${input.tenantId}/product-imports/${jobId}-${input.file.name}`;
  const upload = await serviceClient.storage.from("master-data-imports").upload(objectPath, input.file, {
    contentType: input.file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    upsert: false
  });
  if (upload.error) {
    throw new ProblemDetail(500, "Upload Failed", upload.error.message);
  }

  await serviceClient.from("job_results").insert({
    id: jobId,
    tenant_id: input.tenantId,
    job_type: "master_products_import",
    status: "queued",
    result: { file_path: objectPath },
    created_by: input.userId
  });

  await inngest.send({
    name: "master/products.import",
    data: {
      job_id: jobId,
      file_url: objectPath,
      tenant_id: input.tenantId,
      user_id: input.userId
    }
  });

  return { job_id: jobId };
}

export async function buildProductsExport(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, category, uom, lead_time_days, standard_cost_cents, status, created_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("sku", { ascending: true });
  if (error) {
    throw new ProblemDetail(500, "Export Failed", error.message);
  }

  const workbookBuffer = await createWorkbookBuffer(
    "Products",
    (data ?? []).map((row: Pick<ProductRow, "sku" | "name" | "category" | "uom" | "lead_time_days" | "standard_cost_cents" | "status" | "created_at">) => ({
      SKU: row.sku,
      Name: row.name,
      Category: row.category,
      UoM: row.uom,
      LeadTimeDays: row.lead_time_days,
      StandardCostCents: row.standard_cost_cents,
      Status: row.status,
      CreatedAt: row.created_at
    }))
  );

  return workbookBuffer;
}
