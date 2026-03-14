"use client";

import ReactECharts from "echarts-for-react";

type TrendData = {
  weekly_opened: Record<string, Record<string, number>>;
  resolution_time_by_type: Record<string, number>;
  top_offenders: Array<{ name: string; count: number }>;
};

export function ExceptionTrendsPage({ data }: { data: TrendData }) {
  const weeks = Object.keys(data.weekly_opened).sort();
  const exceptionTypes = Array.from(new Set(Object.values(data.weekly_opened).flatMap((week) => Object.keys(week))));

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Exception Management</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Exception Trends</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <ReactECharts
            style={{ height: 360 }}
            option={{
              tooltip: { trigger: "axis" },
              legend: { top: 0 },
              xAxis: { type: "category", data: weeks },
              yAxis: { type: "value" },
              series: exceptionTypes.map((type) => ({ name: type, type: "bar", stack: "exceptions", data: weeks.map((week) => data.weekly_opened[week]?.[type] ?? 0) }))
            }}
          />
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <ReactECharts
            style={{ height: 360 }}
            option={{
              tooltip: { trigger: "axis" },
              xAxis: { type: "category", data: Object.keys(data.resolution_time_by_type) },
              yAxis: { type: "value" },
              series: [{ type: "bar", data: Object.values(data.resolution_time_by_type), itemStyle: { color: "#0ea5e9" } }]
            }}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_120px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Top Offender</span>
          <span>Count</span>
        </div>
        {data.top_offenders.map((offender) => (
          <div key={offender.name} className="grid grid-cols-[1fr_120px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
            <span className="font-medium text-slate-950">{offender.name}</span>
            <span>{offender.count}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
