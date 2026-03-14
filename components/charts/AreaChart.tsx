"use client";

import ReactECharts from "echarts-for-react";

import { baseChartOptions } from "@/components/charts/theme";

export function AreaChart({ series, xAxis, title, height = 320 }: { series: Array<{ name: string; data: number[] }>; xAxis: string[]; title?: string; height?: number }) {
  return <ReactECharts style={{ height }} option={{ ...baseChartOptions(title), legend: { top: 0 }, xAxis: { type: "category", data: xAxis }, yAxis: { type: "value" }, series: series.map((item) => ({ type: "line", smooth: true, areaStyle: {}, showSymbol: false, ...item })) }} />;
}
