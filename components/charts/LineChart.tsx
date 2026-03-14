"use client";

import ReactECharts from "echarts-for-react";

import { baseChartOptions } from "@/components/charts/theme";

export function LineChart({
  series,
  xAxis,
  title,
  height = 320,
  loading
}: {
  series: Array<{ name: string; data: number[]; color?: string }>;
  xAxis: string[];
  title?: string;
  height?: number;
  loading?: boolean;
}) {
  return (
    <ReactECharts
      showLoading={loading}
      style={{ height }}
      option={{
        ...baseChartOptions(title),
        xAxis: { type: "category", data: xAxis, axisLabel: { color: "#64748b" } },
        yAxis: { type: "value", axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e2e8f0" } } },
        series: series.map((item) => ({
          type: "line",
          smooth: true,
          showSymbol: false,
          data: item.data,
          name: item.name,
          lineStyle: { width: 3, color: item.color },
          itemStyle: { color: item.color }
        }))
      }}
    />
  );
}
