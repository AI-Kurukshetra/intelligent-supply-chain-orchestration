import { beforeEach, describe, expect, it, vi } from "vitest";

import { MrpEngine } from "@/lib/mrp/engine";

const createSupabaseServiceClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: createSupabaseServiceClientMock
}));

function createTableResult(data: unknown) {
  return { data, error: null };
}

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(() => createTableResult(result)),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(createTableResult(result)))
  };
  return query;
}

describe("MrpEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Net requirements equal gross requirement minus inventory and open supply, and negative net requirements generate no order", async () => {
    const rpcMock = vi.fn()
      .mockResolvedValueOnce({ data: 70, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: -5, error: null });

    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        switch (table) {
          case "planning_cycles":
            return createQuery({ id: "cycle-1", tenant_id: "tenant-1", horizon_start: "2025-01-01", horizon_end: "2025-01-31" });
          case "products":
            return createQuery([
              { id: "prod-1", sku: "FG-100", name: "Finished Good", uom: "EA", lead_time_days: 7, min_order_qty: 50, attributes: { ordering_policy: "min_order_qty" } },
              { id: "prod-2", sku: "RM-100", name: "Raw Material", uom: "EA", lead_time_days: 4, min_order_qty: 10, attributes: { ordering_policy: "lot_for_lot" } }
            ]);
          case "inventory_policies":
            return createQuery([{ product_id: "prod-1", facility_id: "fac-1", ordering_policy: "min_order_qty" }]);
          case "bom_lines":
            return createQuery([]);
          case "statistical_forecasts":
            return createQuery([
              { product_id: "prod-1", facility_id: "fac-1", period_start: "2025-01-08", period_end: "2025-01-15", forecast_qty: 100 },
              { product_id: "prod-2", facility_id: "fac-1", period_start: "2025-01-08", period_end: "2025-01-15", forecast_qty: 5 }
            ]);
          case "forecast_overrides":
            return createQuery([]);
          case "suppliers":
            return createQuery([]);
          case "inventory_positions":
            return createQuery([
              { product_id: "prod-1", facility_id: "fac-1", on_hand_qty: 20, reserved_qty: 10 },
              { product_id: "prod-2", facility_id: "fac-1", on_hand_qty: 10, reserved_qty: 0 }
            ]);
          default:
            return createQuery([]);
        }
      }),
      rpc: rpcMock
    });

    const result = await new MrpEngine().run({ tenantId: "tenant-1", planningCycleId: "cycle-1" });

    expect(result.plannedOrders).toHaveLength(1);
    expect(result.plannedOrders[0].quantity).toBe(70);
    expect(result.plannedOrders[0].planned_start_date).toBe("2025-01-01");
    expect(result.plannedOrders[0].due_date).toBe("2025-01-15");
    expect(result.totals.ordersCreated).toBe(1);
  });

  it("Lead time offset and minimum order quantity are respected", async () => {
    const rpcMock = vi.fn()
      .mockResolvedValueOnce({ data: 30, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        switch (table) {
          case "planning_cycles":
            return createQuery({ id: "cycle-1", tenant_id: "tenant-1", horizon_start: "2025-02-01", horizon_end: "2025-02-28" });
          case "products":
            return createQuery([{ id: "prod-1", sku: "FG-200", name: "Widget", uom: "EA", lead_time_days: 5, min_order_qty: 50, attributes: { ordering_policy: "min_order_qty" } }]);
          case "inventory_policies":
            return createQuery([{ product_id: "prod-1", facility_id: "fac-1", ordering_policy: "min_order_qty" }]);
          case "bom_lines":
          case "forecast_overrides":
          case "suppliers":
            return createQuery([]);
          case "statistical_forecasts":
            return createQuery([{ product_id: "prod-1", facility_id: "fac-1", period_start: "2025-02-10", period_end: "2025-02-17", forecast_qty: 30 }]);
          case "inventory_positions":
            return createQuery([{ product_id: "prod-1", facility_id: "fac-1", on_hand_qty: 0, reserved_qty: 0 }]);
          default:
            return createQuery([]);
        }
      }),
      rpc: rpcMock
    });

    const result = await new MrpEngine().run({ tenantId: "tenant-1", planningCycleId: "cycle-1" });

    expect(result.plannedOrders).toHaveLength(1);
    expect(result.plannedOrders[0].quantity).toBe(50);
    expect(result.plannedOrders[0].planned_start_date).toBe("2025-02-05");
  });
});
