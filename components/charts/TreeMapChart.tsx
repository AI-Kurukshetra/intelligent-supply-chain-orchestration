"use client";

import ReactECharts from "echarts-for-react";

import { chartPalette } from "@/components/charts/theme";

export function TreeMapChart({ data, title, height = 360 }: { data: Array<{ name: string; value: number }>; title?: string; height?: number }) {
  return <ReactECharts style={{ height }} option={{ color: chartPalette, title: title ? { text: title, textStyle: { color: "#0f172a", fontSize: 15 } } : undefined, tooltip: { formatter: "{b}: {c}" }, series: [{ type: "treemap", roam: false, breadcrumb: { show: false }, data }] }} />;
}
