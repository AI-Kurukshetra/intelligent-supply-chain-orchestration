export const chartPalette = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#1E3A5F"];

export function baseChartOptions(title?: string) {
  return {
    color: chartPalette,
    backgroundColor: "transparent",
    animationDuration: 240,
    textStyle: { fontFamily: "var(--font-dm-sans)" },
    title: title ? { text: title, textStyle: { color: "#0f172a", fontSize: 15, fontWeight: 600 } } : undefined,
    grid: { left: 28, right: 20, top: title ? 48 : 20, bottom: 28, containLabel: true },
    tooltip: { trigger: "axis" }
  };
}
