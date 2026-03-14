import { beforeEach, describe, expect, it, vi } from "vitest";

import { mape, wmape, bias } from "@/lib/forecasting/accuracy";
import { detectSeasonalLength } from "@/lib/forecasting/models/holtWinters";
import { ForecastEngine } from "@/lib/forecasting/engine";

const createSupabaseServiceClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: createSupabaseServiceClientMock
}));

function createHistoryQuery(rows: Array<Record<string, unknown>>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => ({ data: rows, error: null }))
  };
  return query;
}

describe("ForecastEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SES converges on trend data", async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      period_start: `2025-01-${String(index + 1).padStart(2, "0")}`,
      period_end: `2025-01-${String(index + 8).padStart(2, "0")}`,
      actual_qty: 100 + index * 10
    }));

    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn(() => createHistoryQuery(rows))
    });

    const result = await new ForecastEngine().run({
      tenantId: "tenant-1",
      productId: "product-1",
      facilityId: "facility-1",
      horizonWeeks: 4
    });

    expect(result.model).toBe("ses");
    expect(result.forecasts).toHaveLength(4);
    expect(result.forecasts[0].forecast_qty).toBeGreaterThan(150);
    expect(result.forecasts[3].forecast_qty).toBe(result.forecasts[0].forecast_qty);
  });

  it("Holt-Winters detects seasonality in quarterly data", () => {
    const quarterlySeasonality = [120, 95, 130, 105, 122, 97, 132, 108, 121, 98, 134, 107, 123, 96, 136, 109, 124, 99, 138, 110, 125, 100, 140, 111, 126, 101, 142, 112, 127, 102, 144, 113];
    expect(detectSeasonalLength(quarterlySeasonality)).toBe(4);
  });

  it("Accuracy metrics match manual calculations", () => {
    const actual = [100, 200, 300];
    const forecast = [90, 210, 330];

    expect(mape(actual, forecast)).toBeCloseTo(10, 6);
    expect(wmape(actual, forecast)).toBeCloseTo(50 / 600 * 100, 6);
    expect(bias(actual, forecast)).toBeCloseTo(30 / 600 * 100, 6);
  });

  it("Insufficient data falls back to SES gracefully", async () => {
    const rows = [
      { period_start: "2025-01-01", period_end: "2025-01-08", actual_qty: 48 },
      { period_start: "2025-01-08", period_end: "2025-01-15", actual_qty: 50 },
      { period_start: "2025-01-15", period_end: "2025-01-22", actual_qty: 51 }
    ];

    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn(() => createHistoryQuery(rows))
    });

    const result = await new ForecastEngine().run({
      tenantId: "tenant-1",
      productId: "product-2",
      facilityId: "facility-1",
      horizonWeeks: 2
    });

    expect(result.model).toBe("ses");
    expect(result.accuracy.mae).toBeGreaterThanOrEqual(0);
    expect(result.forecasts.every((row) => row.forecast_qty >= 0)).toBe(true);
  });
});
