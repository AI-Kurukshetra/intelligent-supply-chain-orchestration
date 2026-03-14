import { createSupabaseServiceClient } from "@/lib/supabase/server";

import { calculate as forecastAccuracy } from "./KPI_01_forecastAccuracy";
import { calculate as forecastBias } from "./KPI_02_forecastBias";
import { calculate as orderFillRate } from "./KPI_03_orderFillRate";
import { calculate as otif } from "./KPI_04_otif";
import { calculate as inventoryTurns } from "./KPI_05_inventoryTurns";
import { calculate as daysOfSupply } from "./KPI_06_daysOfSupply";
import { calculate as inventoryValue } from "./KPI_07_inventoryValue";
import { calculate as excessObsolete } from "./KPI_08_excessObsoleteValue";
import { calculate as supplyPlanAttainment } from "./KPI_09_supplyPlanAttainment";
import { calculate as mrpCycleTime } from "./KPI_10_mrpCycleTime";
import { calculate as openExceptionCount } from "./KPI_11_openExceptionCount";
import { calculate as exceptionResolutionTime } from "./KPI_12_exceptionResolutionTime";
import { calculate as supplierOtif } from "./KPI_13_supplierOtif";
import { calculate as supplierLeadTimeAdherence } from "./KPI_14_supplierLeadTimeAdherence";
import { calculate as sopCycleCompletion } from "./KPI_15_sopCycleCompletion";
import type { KpiValue, PeriodInput } from "./common";

const calculators = [
  forecastAccuracy,
  forecastBias,
  orderFillRate,
  otif,
  inventoryTurns,
  daysOfSupply,
  inventoryValue,
  excessObsolete,
  supplyPlanAttainment,
  mrpCycleTime,
  openExceptionCount,
  exceptionResolutionTime,
  supplierOtif,
  supplierLeadTimeAdherence,
  sopCycleCompletion
];

function priorPeriod(period: PeriodInput): PeriodInput {
  const from = new Date(period.from);
  const to = new Date(period.to);
  const span = to.getTime() - from.getTime();
  const priorTo = new Date(from.getTime() - 86400000);
  const priorFrom = new Date(priorTo.getTime() - span);
  return {
    from: priorFrom.toISOString(),
    to: priorTo.toISOString(),
    granularity: period.granularity ?? "weekly"
  };
}

export async function calculateAllKpis(tenantId: string, period: PeriodInput) {
  const supabase = await createSupabaseServiceClient();
  const [results, orgResult] = await Promise.all([
    Promise.all(calculators.map((calculator) => calculator(supabase, tenantId, period))),
    supabase.from("organizations").select("settings").eq("id", tenantId).single()
  ]);

  const targets = ((orgResult.data?.settings as { kpi_targets?: Record<string, number> } | null)?.kpi_targets) ?? {};
  const prior = priorPeriod(period);

  const snapshots = await Promise.all(results.map(async (result: KpiValue) => {
    const { data: previous } = await supabase
      .from("kpi_snapshots")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("kpi_code", result.kpi_code)
      .gte("period_start", prior.from)
      .lte("period_end", prior.to)
      .order("calculated_at", { ascending: false })
      .limit(1);

    const priorValue = Number(previous?.[0]?.value ?? 0);
    const target = targets[result.kpi_code] ?? null;
    const vsPrior = priorValue === 0 ? 0 : ((result.value - priorValue) / Math.abs(priorValue)) * 100;
    const vsTarget = target === null || target === 0 ? 0 : ((result.value - target) / Math.abs(target)) * 100;

    return {
      tenant_id: tenantId,
      kpi_code: result.kpi_code,
      kpi_name: result.kpi_name,
      period_start: period.from,
      period_end: period.to,
      granularity: period.granularity ?? "weekly",
      dimension: result.dimension ?? {},
      value: result.value,
      uom: result.uom,
      trend_direction: result.value > priorValue ? "up" : result.value < priorValue ? "down" : "flat",
      vs_prior_period_pct: Number(vsPrior.toFixed(2)),
      vs_target_pct: Number(vsTarget.toFixed(2)),
      target_value: target,
      calculated_at: new Date().toISOString()
    };
  }));

  return snapshots;
}

