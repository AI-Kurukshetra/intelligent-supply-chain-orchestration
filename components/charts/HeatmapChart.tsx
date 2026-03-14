"use client";

import ReactECharts from "echarts-for-react";

export function HeatmapChart({ xAxis, yAxis, data, title, height = 360 }: { xAxis: string[]; yAxis: string[]; data: Array<[number, number, number]>; title?: string; height?: number }) {
  return <ReactECharts style={{ height }} option={{ title: title ? { text: title, textStyle: { color: "#0f172a", fontSize: 15 } } : undefined, tooltip: { position: "top" }, grid: { left: 70, right: 18, top: title ? 48 : 20, bottom: 20 }, xAxis: { type: "category", data: xAxis, splitArea: { show: true } }, yAxis: { type: "category", data: yAxis, splitArea: { show: true } }, visualMap: { min: 0, max: 100, calculable: true, orient: "horizontal", left: "center", bottom: 0 }, series: [{ type: "heatmap", data, label: { show: false } }] }} />;
}
