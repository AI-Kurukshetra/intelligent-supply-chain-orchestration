import { describe, expect, it } from "vitest";

import {
  calculateEOQ,
  calculateReorderPoint,
  calculateSafetyStock,
  inverseCDF
} from "@/lib/inventory/optimization";

describe("inventory optimization", () => {
  it("Safety stock matches known formula at 95% service level", () => {
    const safetyStock = calculateSafetyStock({
      serviceLevelPct: 95,
      leadTimeDays: 14,
      leadTimeVariabilityDays: 2,
      demandAvgPerDay: 12,
      demandStdPerDay: 4
    });

    expect(safetyStock).toBeCloseTo(43.9248, 4);
  });

  it("ROP equals safety stock plus average demand over lead time", () => {
    const reorderPoint = calculateReorderPoint(12, 14, 43.9248);
    expect(reorderPoint).toBeCloseTo(211.9248, 4);
  });

  it("EOQ minimizes total inventory cost", () => {
    const eoq = calculateEOQ({
      annualDemand: 10000,
      orderingCostCents: 25000,
      unitCostCents: 1000,
      holdingCostPct: 20
    });

    const totalCost = (q: number) => (10000 / q) * 25000 + (q / 2) * (1000 * 0.2);
    expect(totalCost(eoq)).toBeLessThan(totalCost(eoq * 0.5));
    expect(totalCost(eoq)).toBeLessThan(totalCost(eoq * 1.5));
  });

  it("inverseCDF(0.95) approximates 1.645", () => {
    expect(inverseCDF(0.95)).toBeCloseTo(1.6449, 3);
  });
});
