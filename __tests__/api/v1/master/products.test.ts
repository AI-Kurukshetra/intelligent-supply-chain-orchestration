import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.fn();
const getUserContextMock = vi.fn();
const requirePermissionMock = vi.fn();
const searchProductsMock = vi.fn();
const createProductMock = vi.fn();
const writeAuditLogMock = vi.fn();
const softDeleteProductMock = vi.fn();

vi.mock("@/lib/utils/errors", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils/errors")>("@/lib/utils/errors");
  return {
    ...actual,
    requireAuth: requireAuthMock
  };
});

vi.mock("@/lib/auth/server", () => ({
  getUserContext: getUserContextMock
}));

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock
}));

vi.mock("@/lib/master-data/service", () => ({
  searchProducts: searchProductsMock,
  createProduct: createProductMock,
  writeAuditLog: writeAuditLogMock,
  softDeleteProduct: softDeleteProductMock,
  getProductDetail: vi.fn(),
  updateProduct: vi.fn()
}));

const productsRoute = await import("@/app/api/v1/master/products/route");
const productByIdRoute = await import("@/app/api/v1/master/products/[id]/route");

describe("master products routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ id: "user-1" });
    getUserContextMock.mockResolvedValue({ tenantId: "tenant-a", role: "planner" });
  });

  it("GET list returns paginated products for tenant", async () => {
    searchProductsMock.mockResolvedValue({ data: [{ id: "p1", tenant_id: "tenant-a", sku: "SKU-1" }], next_cursor: null, has_more: false });
    const response = await productsRoute.GET(new Request("http://localhost/api/v1/master/products?limit=10"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(searchProductsMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", limit: 10 }));
    expect(body.data).toHaveLength(1);
  });

  it("GET list does not return products from other tenant", async () => {
    searchProductsMock.mockResolvedValue({ data: [{ id: "p1", tenant_id: "tenant-a", sku: "SKU-1" }], next_cursor: null, has_more: false });
    const response = await productsRoute.GET(new Request("http://localhost/api/v1/master/products"));
    const body = await response.json();
    expect(body.data.every((product: { tenant_id: string }) => product.tenant_id === "tenant-a")).toBe(true);
  });

  it("POST creates product with audit log entry", async () => {
    createProductMock.mockResolvedValue({ id: "p2", sku: "SKU-2" });
    const response = await productsRoute.POST(new Request("http://localhost/api/v1/master/products", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "vitest" },
      body: JSON.stringify({ sku: "SKU-2", name: "Capacitor", category: "components", uom: "EA" })
    }));
    expect(response.status).toBe(201);
    expect(writeAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ entityType: "product", action: "create" }));
  });

  it("POST rejects duplicate SKU within the same tenant", async () => {
    createProductMock.mockRejectedValue(new Error("duplicate key value violates unique constraint products_tenant_id_sku_key"));
    const response = await productsRoute.POST(new Request("http://localhost/api/v1/master/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku: "SKU-1", name: "Duplicate", category: "components", uom: "EA" })
    }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ detail: expect.stringContaining("duplicate") }));
  });

  it("DELETE soft-deletes a product while keeping it in the database", async () => {
    softDeleteProductMock.mockResolvedValue({ id: "p1", deleted_at: "2026-03-14T00:00:00Z" });
    const response = await productByIdRoute.DELETE(new Request("http://localhost/api/v1/master/products/p1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "p1" })
    });
    expect(response.status).toBe(200);
    expect(softDeleteProductMock).toHaveBeenCalledWith("tenant-a", "p1");
    expect(writeAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: "delete", entityId: "p1" }));
  });
});
