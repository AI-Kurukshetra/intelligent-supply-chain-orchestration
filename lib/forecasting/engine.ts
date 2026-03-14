import { bias, mape, wmape } from "@/lib/forecasting/accuracy";
import { holts, optimizeHolts } from "@/lib/forecasting/models/holts";
import { detectSeasonalLength, holtWinters } from "@/lib/forecasting/models/holtWinters";
import { optimizeAlpha, ses } from "@/lib/forecasting/models/ses";
import { ProblemDetail } from "@/lib/utils/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ForecastPeriod = {
  period_start: string;
  period_end: string;
  forecast_qty: number;
  lower_bound_qty: number;
  upper_bound_qty: number;
  confidence_pct: number;
};

export type AccuracyMetrics = {
  mape: number;
  wmape: number;
  bias: number;
  mae: number;
};

export type ForecastResult = {
  forecasts: ForecastPeriod[];
  accuracy: AccuracyMetrics;
  model: string;
  residualSigma: number;
  history: Array<{ period_start: string; actual_qty: number }>;
};

type DemandHistoryRow = {
  period_start: string;
  period_end: string;
  actual_qty: number;
};

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addWeeks(value: string, weeks: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return toDateString(date);
}

function computeMae(actual: number[], forecast: number[]): number {
  const length = Math.min(actual.length, forecast.length);
  if (length === 0) {
    return 0;
  }

  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += Math.abs(actual[index] - forecast[index]);
  }

  return total / length;
}

function computeSigma(residuals: number[]): number {
  if (residuals.length === 0) {
    return 0;
  }

  const mean = residuals.reduce((sum, value) => sum + value, 0) / residuals.length;
  const variance = residuals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / residuals.length;
  return Math.sqrt(variance);
}

function projectSes(data: number[], horizon: number) {
  const alpha = optimizeAlpha(data);
  const fitted = ses(data, alpha);
  const next = fitted.at(-1) ?? data.at(-1) ?? 0;
  return {
    model: "ses",
    inSample: fitted.slice(0, data.length),
    projected: Array.from({ length: horizon }, () => next)
  };
}

function projectHolts(data: number[], horizon: number) {
  const params = optimizeHolts(data);
  const fit = holts(data, params.alpha, params.beta);
  const level = fit.forecast.at(-1) ?? data.at(-1) ?? 0;
  const projected = Array.from({ length: horizon }, (_, index) => Math.max(0, level + fit.trend * (index + 1)));
  return {
    model: "holts",
    inSample: fit.forecast.slice(0, data.length),
    projected
  };
}

function projectHoltWinters(data: number[], horizon: number) {
  const seasonLength = detectSeasonalLength(data);
  const alpha = 0.3;
  const beta = 0.1;
  const gamma = 0.2;
  const fitted = holtWinters(data, seasonLength, alpha, beta, gamma);
  const seasonals = data.slice(-seasonLength);
  const level = fitted.at(-1) ?? data.at(-1) ?? 0;
  const projected = Array.from({ length: horizon }, (_, index) => {
    const seasonal = seasonals[index % seasonLength] ?? 0;
    return Math.max(0, level + seasonal * 0.15);
  });

  return {
    model: `holt_winters_${seasonLength}`,
    inSample: fitted.slice(0, data.length),
    projected
  };
}

export class ForecastEngine {
  async run(params: {
    tenantId: string;
    productId: string;
    facilityId: string;
    horizonWeeks: number;
  }): Promise<ForecastResult> {
    const supabase = await createSupabaseServiceClient();
    const since = addWeeks(toDateString(new Date()), -104);
    const { data, error } = await supabase
      .from("demand_history")
      .select("period_start, period_end, actual_qty")
      .eq("tenant_id", params.tenantId)
      .eq("product_id", params.productId)
      .eq("facility_id", params.facilityId)
      .gte("period_start", since)
      .order("period_start", { ascending: true });

    if (error) {
      throw new ProblemDetail(500, "Forecast Data Error", error.message);
    }

    const historyRows = (data ?? []) as DemandHistoryRow[];
    if (historyRows.length < 2) {
      throw new ProblemDetail(400, "Insufficient History", "At least two demand history periods are required to run a forecast.");
    }

    const series = historyRows.map((row) => Number(row.actual_qty));
    const modelResult =
      series.length < 13 ? projectSes(series, params.horizonWeeks) : series.length < 52 ? projectHolts(series, params.horizonWeeks) : projectHoltWinters(series, params.horizonWeeks);

    const holdoutSize = Math.min(13, Math.max(series.length - 1, 1));
    const actualHoldout = series.slice(-holdoutSize);
    const forecastHoldout = modelResult.inSample.slice(-holdoutSize);
    const residuals = actualHoldout.map((value, index) => value - (forecastHoldout[index] ?? value));
    const sigma = computeSigma(residuals);
    const intervalWidth = 1.28 * sigma;

    const lastPeriodStart = historyRows.at(-1)?.period_start ?? toDateString(new Date());
    const forecasts = modelResult.projected.map((value, index) => {
      const periodStart = addWeeks(lastPeriodStart, index + 1);
      return {
        period_start: periodStart,
        period_end: addWeeks(periodStart, 1),
        forecast_qty: Number(value.toFixed(4)),
        lower_bound_qty: Number(Math.max(0, value - intervalWidth).toFixed(4)),
        upper_bound_qty: Number((value + intervalWidth).toFixed(4)),
        confidence_pct: 80
      };
    });

    return {
      forecasts,
      accuracy: {
        mape: Number(mape(actualHoldout, forecastHoldout).toFixed(4)),
        wmape: Number(wmape(actualHoldout, forecastHoldout).toFixed(4)),
        bias: Number(bias(actualHoldout, forecastHoldout).toFixed(4)),
        mae: Number(computeMae(actualHoldout, forecastHoldout).toFixed(4))
      },
      model: modelResult.model,
      residualSigma: Number(sigma.toFixed(4)),
      history: historyRows.map((row) => ({ period_start: row.period_start, actual_qty: Number(row.actual_qty) }))
    };
  }
}

