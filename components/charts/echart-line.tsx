"use client";

import { LineChart } from "@/components/charts/LineChart";

type Series = { name: string; data: Array<number | [string, number]>; color?: string };

export function EChartLine({ title, categories, series, height = 320 }: { title?: string; categories: string[]; series: Series[]; height?: number }) {
  return (
    <LineChart
      title={title}
      xAxis={categories}
      height={height}
      series={series.map((item) => ({
        name: item.name,
        color: item.color,
        data: item.data.map((entry) => (Array.isArray(entry) ? entry[1] : entry))
      }))}
    />
  );
}
