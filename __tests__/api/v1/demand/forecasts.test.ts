import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.fn();
const getUserContextMock = vi.fn();
const requirePermissionMock = vi.fn();
const resolveForecastRunProductsMock = vi.fn();
const createForecastRunMock = vi.fn();
const getForecastRunMock = vi.fn();
const listForecastsMock = vi.fn();
const inngestSendMock = vi.fn();

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

vi.mock("@/lib/demand/service", () => ({
  resolveForecastRunProducts: resolveForecastRunProductsMock,
  createForecastRun: createForecastRunMock,
  listForecastRuns: vi.fn(),
  getForecastRun: getForecastRunMock,
  listForecasts: listForecastsMock
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: inngestSendMock
  }
}));

const runsRoute = await import("@/app/api/v1/demand/forecasts/runs/route");
const runByIdRoute = await import("@/app/api/v1/demand/forecasts/runs/[runId]/route");
const forecastsRoute = await import("@/app/api/v1/demand/forecasts/route");

describe("demand forecast routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ id: "user-1" });
    getUserContextMock.mockResolvedValue({ tenantId: "tenant-a", role: "planner" });
  });

  it("POST /runs returns run_id and queues an Inngest event", async () => {
    resolveForecastRunProductsMock.mockResolvedValue({ facilityId: "fac-1", horizonWeeks: 13, productIds: ["prod-1"] });
    createForecastRunMock.mockResolvedValue({ id: "run-1" });
    const response = await runsRoute.POST(new Request("http://localhost/api/v1/demand/forecasts/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ facility_id: "fac-1", horizon_weeks: 13, product_ids: ["prod-1"] })
    }));
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toEqual({ run_id: "run-1", status: "queued" });
    expect(inngestSendMock).toHaveBeenCalledWith(expect.objectContaining({ name: "demand/forecast.run" }));
  });

  it("GET /runs/[id] returns current status", async () => {
    getForecastRunMock.mockResolvedValue({ id: "run-1", status: "running" });
    const response = await runByIdRoute.GET(new Request("http://localhost/api/v1/demand/forecasts/runs/run-1"), {
      params: Promise.resolve({ runId: "run-1" })
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ id: "run-1", status: "running" }));
  });

  it("GET returns latest forecasts filtered by product_id", async () => {
    listForecastsMock.mockResolvedValue([{ id: "f-1", product_id: "prod-9", forecast_qty: 100 }]);
    const response = await forecastsRoute.GET(new Request("http://localhost/api/v1/demand/forecasts?product_id=prod-9"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(listForecastsMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", productId: "prod-9" }));
    expect(body.data).toHaveLength(1);
  });
});
