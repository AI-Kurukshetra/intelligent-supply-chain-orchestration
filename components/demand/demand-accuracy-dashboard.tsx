"use client";

import { EChartLine } from "@/components/charts/echart-line";

export function DemandAccuracyDashboard({
  overall,
  series,
  rows
}: {
  overall: { mape: number; wmape: number; bias: number };
  series: Record<string, Array<{ period: string; value: number }>>;
  rows: Array<{ sku: string; name: string; category: string; mape: number; wmape: number; bias: number }>;
}) {
  const categories = Array.from(new Set(Object.values(series).flat().map((point) => point.period))).sort();

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Demand Accuracy</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Forecast Accuracy</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Overall MAPE", value: overall.mape, threshold: 15 },
            { label: "Overall WMAPE", value: overall.wmape, threshold: 15 },
            { label: "Bias", value: overall.bias, threshold: 15 }
          ].map((tile) => (
            <div key={tile.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tile.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${Math.abs(tile.value) <= tile.threshold ? "text-emerald-600" : "text-rose-600"}`}>{tile.value.toFixed(2)}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <EChartLine
          title="MAPE Trend By Product Category"
          categories={categories}
          series={Object.entries(series).map(([category, points], index) => ({
            name: category,
            data: categories.map((period) => points.find((point) => point.period === period)?.value ?? 0),
            color: ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444"][index % 4]
          }))}
          height={360}
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[140px_1.4fr_160px_120px_120px_120px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>SKU</span>
          <span>Name</span>
          <span>Category</span>
          <span>MAPE</span>
          <span>WMAPE</span>
          <span>Bias</span>
        </div>
        {rows.map((row) => (
          <div key={row.sku} className="grid grid-cols-[140px_1.4fr_160px_120px_120px_120px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
            <span className="font-semibold text-slate-950">{row.sku}</span>
            <span>{row.name}</span>
            <span>{row.category}</span>
            <span>{row.mape.toFixed(2)}%</span>
            <span>{row.wmape.toFixed(2)}%</span>
            <span>{row.bias.toFixed(2)}%</span>
          </div>
        ))}
      </section>
    </div>
  );
}
