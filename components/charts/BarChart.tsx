"use client";

import ReactECharts from "echarts-for-react";

import { baseChartOptions } from "@/components/charts/theme";

export function BarChart({ series, xAxis, stacked, title, height = 320 }: { series: Array<{ name: string; data: number[] }>; xAxis: string[]; stacked?: boolean; title?: string; height?: number }) {
  return <ReactECharts style={{ height }} option={{ ...baseChartOptions(title), legend: { top: 0 }, xAxis: { type: "category", data: xAxis, axisLabel: { color: "#64748b" } }, yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, series: series.map((item) => ({ type: "bar", stack: stacked ? "total" : undefined, barMaxWidth: 26, ...item })) }} />;
}
