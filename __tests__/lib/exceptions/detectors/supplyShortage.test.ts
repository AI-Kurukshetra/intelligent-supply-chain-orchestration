import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceClientMock = vi.fn();
const inngestSendMock = vi.fn();
const allDetectorsMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: createSupabaseServiceClientMock
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: inngestSendMock
  }
}));

vi.mock("@/lib/exceptions/detectors", () => ({
  allDetectors: [allDetectorsMock]
}));

import { detectSupplyShortage } from "@/lib/exceptions/detectors/EX001_supplyShortage";
import { ExceptionOrchestrator, listExceptions } from "@/lib/exceptions/orchestrator";

function createDetectorSupabase() {
  const datasets: Record<string, unknown[]> = {
    statistical_forecasts: [{ product_id: "prod-1", facility_id: "fac-1", forecast_qty: 120, period_start: "2099-01-01" }],
    inventory_positions: [{ product_id: "prod-1", facility_id: "fac-1", on_hand_qty: 40, reserved_qty: 10 }],
    open_supply_orders: [{ product_id: "prod-1", facility_id: "fac-1", confirmed_qty: 20, expected_date: "2099-01-10" }],
    products: [{ id: "prod-1", sku: "FG-100", name: "Control Board" }],
    facilities: [{ id: "fac-1", name: "Main Plant" }]
  };

  return {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: datasets[table] ?? [], error: null }))
      };
      return query;
    })
  };
}

describe("EX001 supply shortage detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Creates an exception when supply gap is detected", async () => {
    const exceptions = await detectSupplyShortage(createDetectorSupabase() as never, "tenant-1");
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].exception_type).toBe("EX001_supplyShortage");
    expect(exceptions[0].context_json.gap_qty).toBe(50);
  });

  it("Does not duplicate an existing open exception for the same entity", async () => {
    allDetectorsMock.mockResolvedValue([
      {
        exception_type: "EX001_supplyShortage",
        severity: "critical",
        title: "Gap",
        description: "Gap detected",
        entity_type: "product",
        entity_id: "prod-1",
        entity_name: "Control Board",
        facility_id: "fac-1",
        context_json: { gap_qty: 50 }
      }
    ]);

    const exceptionsInsertMock = vi.fn(() => ({ select: vi.fn(() => ({ data: [], error: null })) }));
    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "exceptions") {
          const query = {
            select: vi.fn(() => query),
            eq: vi.fn(() => query),
            in: vi.fn(() => query),
            insert: exceptionsInsertMock,
            then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [{ id: "exc-1", exception_type: "EX001_supplyShortage", entity_id: "prod-1", severity: "critical", detected_at: new Date().toISOString() }], error: null }))
          };
          return query;
        }
        return { insert: exceptionsInsertMock };
      })
    });

    await new ExceptionOrchestrator().runAll("tenant-1");
    expect(exceptionsInsertMock).not.toHaveBeenCalled();
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("Priority score calculation matches the formula", async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    createSupabaseServiceClientMock.mockResolvedValue({
      from: vi.fn(() => {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => ({
            data: [
              {
                id: "exc-1",
                exception_type: "EX001_supplyShortage",
                severity: "critical",
                status: "open",
                title: "Gap",
                description: null,
                entity_type: "product",
                entity_id: "prod-1",
                entity_name: "Control Board",
                facility_id: "fac-1",
                detected_at: oldDate,
                acknowledged_at: null,
                acknowledged_by: null,
                resolved_at: null,
                resolved_by: null,
                resolution_notes: null,
                resolution_action: null,
                priority_score: 97,
                ai_recommendation: null,
                suppressed_until: null,
                context_json: {},
                last_alert_sent_at: null,
                created_at: oldDate,
                updated_at: oldDate
              }
            ],
            error: null
          }))
        };
        return query;
      })
    });

    const rows = await listExceptions({ tenantId: "tenant-1" });
    expect(rows[0].priority_score).toBe(97);
  });
});
