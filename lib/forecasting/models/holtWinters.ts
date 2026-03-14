function autocorrelation(data: number[], lag: number): number {
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < data.length; index += 1) {
    const centered = data[index] - mean;
    denominator += centered * centered;
    if (index >= lag) {
      numerator += centered * (data[index - lag] - mean);
    }
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

export function detectSeasonalLength(data: number[]): number {
  if (data.length < 26) {
    return 4;
  }

  const candidates = [4, 6, 12, 13, 26, 52].filter((candidate) => candidate < data.length / 2);
  let bestLag = 13;
  let bestScore = Number.NEGATIVE_INFINITY;

  candidates.forEach((lag) => {
    const score = autocorrelation(data, lag);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  });

  return bestLag;
}

export function holtWinters(
  data: number[],
  seasonLength: number,
  alpha: number,
  beta: number,
  gamma: number
): number[] {
  if (data.length === 0) {
    return [];
  }

  if (data.length < seasonLength * 2) {
    return [...data];
  }

  const initialSeasonals = Array.from({ length: seasonLength }, (_, index) => {
    const seasonA = data[index] ?? 0;
    const seasonB = data[index + seasonLength] ?? seasonA;
    return seasonA - seasonB;
  });

  let level = data.slice(0, seasonLength).reduce((sum, value) => sum + value, 0) / seasonLength;
  let trend =
    data.slice(seasonLength, seasonLength * 2).reduce((sum, value) => sum + value, 0) / seasonLength - level;
  trend /= seasonLength;

  const seasonals = [...initialSeasonals];
  const fitted: number[] = [];

  for (let index = 0; index < data.length; index += 1) {
    const season = seasonals[index % seasonLength] ?? 0;
    const prediction = level + trend + season;
    fitted.push(index === 0 ? data[0] : prediction);

    const actual = data[index];
    const previousLevel = level;
    level = alpha * (actual - season) + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
    seasonals[index % seasonLength] = gamma * (actual - level) + (1 - gamma) * season;
  }

  fitted.push(level + trend + (seasonals[data.length % seasonLength] ?? 0));
  return fitted;
}
