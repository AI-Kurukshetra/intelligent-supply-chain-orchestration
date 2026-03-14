import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.fn();
const getUserContextMock = vi.fn();
const listExceptionsMock = vi.fn();
const acknowledgeExceptionMock = vi.fn();
const bulkResolveExceptionsMock = vi.fn();

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

vi.mock("@/lib/exceptions/orchestrator", () => ({
  listExceptions: listExceptionsMock,
  acknowledgeException: acknowledgeExceptionMock,
  bulkResolveExceptions: bulkResolveExceptionsMock,
  getExceptionAnalyticsSummary: vi.fn(),
  getExceptionDetail: vi.fn()
}));

const exceptionsRoute = await import("@/app/api/v1/exceptions/route");
const exceptionAcknowledgeRoute = await import("@/app/api/v1/exceptions/[id]/acknowledge/route");
const exceptionBulkResolveRoute = await import("@/app/api/v1/exceptions/bulk-resolve/route");

describe("exception routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ id: "user-1" });
    getUserContextMock.mockResolvedValue({ tenantId: "tenant-a", role: "planner" });
  });

  it("GET queue returns exceptions sorted by priority_score DESC", async () => {
    listExceptionsMock.mockResolvedValue([{ id: "e1", priority_score: 90 }, { id: "e2", priority_score: 70 }]);
    const response = await exceptionsRoute.GET(new Request("http://localhost/api/v1/exceptions"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data[0].priority_score).toBeGreaterThan(body.data[1].priority_score);
  });

  it("PATCH acknowledge updates status and acknowledged_by", async () => {
    acknowledgeExceptionMock.mockResolvedValue({ id: "e1", status: "acknowledged", acknowledged_by: "user-1" });
    const response = await exceptionAcknowledgeRoute.PATCH(new Request("http://localhost/api/v1/exceptions/e1/acknowledge", { method: "PATCH" }), {
      params: Promise.resolve({ id: "e1" })
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ status: "acknowledged", acknowledged_by: "user-1" }));
  });

  it("POST bulk-resolve resolves all provided IDs", async () => {
    bulkResolveExceptionsMock.mockResolvedValue([{ id: "e1" }, { id: "e2" }, { id: "e3" }]);
    const response = await exceptionBulkResolveRoute.POST(new Request("http://localhost/api/v1/exceptions/bulk-resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["e1", "e2", "e3"], resolution_notes: "Handled", resolution_action: "replan" })
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ id: "e1" })]) }));
  });

  it("Cross-tenant access returns 404", async () => {
    const actual = await vi.importActual<typeof import("@/lib/utils/errors")>("@/lib/utils/errors");
    acknowledgeExceptionMock.mockRejectedValue(new actual.ProblemDetail(404, "Not Found", "Exception not found."));
    const response = await exceptionAcknowledgeRoute.PATCH(new Request("http://localhost/api/v1/exceptions/e9/acknowledge", { method: "PATCH" }), {
      params: Promise.resolve({ id: "e9" })
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ detail: "Exception not found." }));
  });
});
