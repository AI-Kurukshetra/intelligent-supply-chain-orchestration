function clampProbability(value: number) {
  return Math.min(Math.max(value, 1e-10), 1 - 1e-10);
}

function roundQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

export function inverseCDF(p: number): number {
  const probability = clampProbability(p);
  const a1 = -39.6968302866538;
  const a2 = 220.946098424521;
  const a3 = -275.928510446969;
  const a4 = 138.357751867269;
  const a5 = -30.6647980661472;
  const a6 = 2.50662827745924;

  const b1 = -54.4760987982241;
  const b2 = 161.585836858041;
  const b3 = -155.698979859887;
  const b4 = 66.8013118877197;
  const b5 = -13.2806815528857;

  const c1 = -0.00778489400243029;
  const c2 = -0.322396458041136;
  const c3 = -2.40075827716184;
  const c4 = -2.54973253934373;
  const c5 = 4.37466414146497;
  const c6 = 2.93816398269878;

  const d1 = 0.00778469570904146;
  const d2 = 0.32246712907004;
  const d3 = 2.445134137143;
  const d4 = 3.75440866190742;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (probability < pLow) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  if (probability > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  const q = probability - 0.5;
  const r = q * q;
  return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
}

export function calculateSafetyStock(params: {
  serviceLevelPct: number;
  leadTimeDays: number;
  leadTimeVariabilityDays: number;
  demandAvgPerDay: number;
  demandStdPerDay: number;
}): number {
  const zScore = inverseCDF(params.serviceLevelPct / 100);
  const demandVariance = params.leadTimeDays * params.demandStdPerDay ** 2;
  const leadVariance = params.demandAvgPerDay ** 2 * params.leadTimeVariabilityDays ** 2;
  return roundQuantity(zScore * Math.sqrt(Math.max(demandVariance + leadVariance, 0)));
}

export function calculateReorderPoint(demandAvgPerDay: number, leadTimeDays: number, safetyStock: number): number {
  return roundQuantity(demandAvgPerDay * leadTimeDays + safetyStock);
}

export function calculateEOQ(params: {
  annualDemand: number;
  orderingCostCents: number;
  unitCostCents: number;
  holdingCostPct: number;
}): number {
  const holdingRate = params.holdingCostPct / 100;
  const annualHoldingCost = Math.max(params.unitCostCents * holdingRate, 0.0001);
  const numerator = 2 * Math.max(params.annualDemand, 0) * Math.max(params.orderingCostCents, 0);
  return roundQuantity(Math.sqrt(numerator / annualHoldingCost));
}
