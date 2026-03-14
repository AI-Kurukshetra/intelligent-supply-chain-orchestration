"use client";

import ReactECharts from "echarts-for-react";

export function SparklineChart({ data }: { data: number[] }) {
  return <ReactECharts style={{ height: 36, width: "100%" }} option={{ animation: false, grid: { left: 0, right: 0, top: 4, bottom: 2 }, xAxis: { type: "category", show: false, data: data.map((_, index) => index + 1) }, yAxis: { type: "value", show: false }, series: [{ type: "line", data, smooth: true, showSymbol: false, lineStyle: { color: "#0EA5E9", width: 2 }, areaStyle: { color: "rgba(14,165,233,0.12)" } }] }} />;
}
