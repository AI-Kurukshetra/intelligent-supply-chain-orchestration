export function holts(data: number[], alpha: number, beta: number): { forecast: number[]; trend: number } {
  if (data.length === 0) {
    return { forecast: [], trend: 0 };
  }

  let level = data[0];
  let trend = data.length > 1 ? data[1] - data[0] : 0;
  const fitted: number[] = [data[0]];

  for (let index = 1; index < data.length; index += 1) {
    const previousLevel = level;
    const prediction = level + trend;
    fitted.push(prediction);
    level = alpha * data[index] + (1 - alpha) * prediction;
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }

  fitted.push(level + trend);
  return { forecast: fitted, trend };
}

export function optimizeHolts(data: number[]): { alpha: number; beta: number } {
  if (data.length < 3) {
    return { alpha: 0.4, beta: 0.2 };
  }

  let best = { alpha: 0.4, beta: 0.2 };
  let bestScore = Number.POSITIVE_INFINITY;

  for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
    for (let beta = 0.1; beta <= 0.9; beta += 0.1) {
      const params = { alpha: Number(alpha.toFixed(2)), beta: Number(beta.toFixed(2)) };
      const fitted = holts(data, params.alpha, params.beta).forecast;
      let sse = 0;
      for (let index = 1; index < data.length; index += 1) {
        const error = data[index] - fitted[index];
        sse += error * error;
      }
      if (sse < bestScore) {
        bestScore = sse;
        best = params;
      }
    }
  }

  return best;
}
