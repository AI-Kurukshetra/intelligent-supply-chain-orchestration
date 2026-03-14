export function ses(data: number[], alpha: number): number[] {
  if (data.length === 0) {
    return [];
  }

  const fitted: number[] = [data[0]];
  let level = data[0];

  for (let index = 1; index < data.length; index += 1) {
    fitted.push(level);
    level = alpha * data[index] + (1 - alpha) * level;
  }

  fitted.push(level);
  return fitted;
}

export function optimizeAlpha(data: number[]): number {
  if (data.length < 2) {
    return 0.4;
  }

  let bestAlpha = 0.4;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let alpha = 0.05; alpha <= 0.95; alpha += 0.05) {
    const fitted = ses(data, Number(alpha.toFixed(2)));
    let sse = 0;

    for (let index = 1; index < data.length; index += 1) {
      const error = data[index] - fitted[index];
      sse += error * error;
    }

    if (sse < bestScore) {
      bestScore = sse;
      bestAlpha = Number(alpha.toFixed(2));
    }
  }

  return bestAlpha;
}
