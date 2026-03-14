function pairwise(actual: number[], forecast: number[]) {
  const length = Math.min(actual.length, forecast.length);
  return Array.from({ length }, (_, index) => ({ actual: actual[index], forecast: forecast[index] }));
}

export function mape(actual: number[], forecast: number[]): number {
  const pairs = pairwise(actual, forecast).filter((pair) => pair.actual !== 0);
  if (pairs.length === 0) {
    return 0;
  }
  const total = pairs.reduce((sum, pair) => sum + Math.abs((pair.actual - pair.forecast) / pair.actual), 0);
  return (total / pairs.length) * 100;
}

export function wmape(actual: number[], forecast: number[]): number {
  const pairs = pairwise(actual, forecast);
  const denominator = pairs.reduce((sum, pair) => sum + Math.abs(pair.actual), 0);
  if (denominator === 0) {
    return 0;
  }
  const numerator = pairs.reduce((sum, pair) => sum + Math.abs(pair.actual - pair.forecast), 0);
  return (numerator / denominator) * 100;
}

export function bias(actual: number[], forecast: number[]): number {
  const pairs = pairwise(actual, forecast);
  const denominator = pairs.reduce((sum, pair) => sum + Math.abs(pair.actual), 0);
  if (denominator === 0) {
    return 0;
  }
  const numerator = pairs.reduce((sum, pair) => sum + (pair.forecast - pair.actual), 0);
  return (numerator / denominator) * 100;
}
