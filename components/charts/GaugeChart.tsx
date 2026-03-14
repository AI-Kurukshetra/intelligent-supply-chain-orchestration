"use client";

import ReactECharts from "echarts-for-react";

export function GaugeChart({ value, title, height = 280 }: { value: number; title?: string; height?: number }) {
  return <ReactECharts style={{ height }} option={{ title: title ? { text: title, textStyle: { color: "#0f172a", fontSize: 15 } } : undefined, series: [{ type: "gauge", startAngle: 210, endAngle: -30, progress: { show: true, width: 12, itemStyle: { color: "#0EA5E9" } }, axisLine: { lineStyle: { width: 12, color: [[1, "#e2e8f0"]] } }, detail: { formatter: "{value}%", color: "#0f172a", fontSize: 22, fontWeight: 700 }, data: [{ value: Number(value.toFixed(1)) }] }] }} />;
}
