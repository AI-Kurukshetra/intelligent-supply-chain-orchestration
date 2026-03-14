"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type KpiSnapshot = {
  kpi_code: string;
  kpi_name: string;
  value: number;
  uom: string | null;
  vs_prior_period_pct: number | null;
  vs_target_pct: number | null;
  target_value: number | null;
  trend_direction: string | null;
};

type ExceptionRow = { id: string; title: string; severity: string; detected_at: string };

type CycleRow = { id: string; cycle_name: string; status: string; cycle_month: number; cycle_year: number };

function tone(snapshot: KpiSnapshot) {
  if ((snapshot.vs_target_pct ?? 0) >= 0) return "emerald";
  if ((snapshot.vs_target_pct ?? 0) >= -10) return "amber";
  return "rose";
}

export function ExecutiveDashboard({ initialKpis, initialExceptions, cycles }: { initialKpis: KpiSnapshot[]; initialExceptions: ExceptionRow[]; cycles: CycleRow[] }) {
  const [exceptions, setExceptions] = useState(initialExceptions);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("dashboard-exceptions").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "exceptions" },
      () => window.fetch("/api/v1/analytics/dashboard/executive").then((response) => response.json()).then((payload) => setExceptions(payload.exceptions ?? initialExceptions)).catch(() => undefined)
    ).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [initialExceptions]);

  const cycle = cycles[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {initialKpis.map((snapshot) => {
          const palette = tone(snapshot);
          return (
            <div key={snapshot.kpi_code} className={`rounded-3xl border bg-white p-5 shadow-sm ${palette === "emerald" ? "border-emerald-200" : palette === "amber" ? "border-amber-200" : "border-rose-200"}`}>
              <p className="text-sm text-slate-500">{snapshot.kpi_name}</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-slate-900">{Number(snapshot.value ?? 0).toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{snapshot.uom}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${palette === "emerald" ? "bg-emerald-100 text-emerald-700" : palette === "amber" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>
                  {snapshot.vs_prior_period_pct?.toFixed(1) ?? "0.0"}%
                </span>
              </div>
              <div className="mt-4">
                <ReactECharts style={{ height: 80 }} option={{ animation: false, grid: { left: 0, right: 0, top: 8, bottom: 0 }, xAxis: { type: "category", show: false, data: [1, 2, 3, 4, 5, 6, 7] }, yAxis: { type: "value", show: false }, series: [{ type: "line", smooth: true, data: [snapshot.value * 0.82, snapshot.value * 0.88, snapshot.value * 0.91, snapshot.value * 0.95, snapshot.value * 0.93, snapshot.value * 0.98, snapshot.value], showSymbol: false, lineStyle: { width: 3, color: palette === "emerald" ? "#10b981" : palette === "amber" ? "#f59e0b" : "#ef4444" }, areaStyle: { color: palette === "emerald" ? "rgba(16,185,129,0.12)" : palette === "amber" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)" } }] }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Top Critical Exceptions</h2>
          <div className="mt-4 space-y-3">
            {exceptions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">Detected {new Date(item.detected_at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{item.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Planning Cycle Status</h2>
          {cycle ? (
            <div className="mt-4">
              <p className="text-lg font-semibold text-slate-900">{cycle.cycle_name}</p>
              <p className="text-sm text-slate-500">{cycle.cycle_month}/{cycle.cycle_year}</p>
              <div className="mt-5 grid gap-3">
                {["statistical_forecast", "demand_review", "supply_review", "financial_reconciliation", "executive_review"].map((step) => (
                  <div key={step} className={`rounded-2xl border px-4 py-3 ${cycle.status === step ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50"}`}>
                    <p className="text-sm font-medium text-slate-800">{step.replaceAll("_", " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No active S&amp;OP cycle.</p>}
        </div>
      </section>
    </div>
  );
}

export function AnalyticsDeepDive({ initialCurrent, initialHistory }: { initialCurrent: KpiSnapshot[]; initialHistory: Record<string, Array<Record<string, unknown>>> }) {
  const [selected, setSelected] = useState(initialCurrent[0]?.kpi_code ?? "KPI_01");
  const [windowSize, setWindowSize] = useState("52W");
  const [dimension, setDimension] = useState("facility");
  const history = initialHistory[selected] ?? [];
  const chartCategories = useMemo(() => history.map((item) => String(item.period_start ?? "")), [history]);
  const chartValues = useMemo(() => history.map((item) => Number(item.value ?? 0)), [history]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {initialCurrent.map((kpi) => (
            <button key={kpi.kpi_code} className={`rounded-full px-4 py-2 text-sm font-medium ${selected === kpi.kpi_code ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setSelected(kpi.kpi_code)}>{kpi.kpi_name}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {['4W','13W','26W','52W'].map((value) => <button key={value} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${windowSize === value ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`} onClick={() => setWindowSize(value)}>{value}</button>)}
          {['facility','category'].map((value) => <button key={value} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dimension === value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`} onClick={() => setDimension(value)}>{value}</button>)}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ReactECharts style={{ height: 420 }} option={{ tooltip: { trigger: "axis" }, grid: { left: 32, right: 24, top: 24, bottom: 32, containLabel: true }, xAxis: { type: "category", data: chartCategories }, yAxis: { type: "value" }, series: [{ type: "line", smooth: true, data: chartValues, showSymbol: false, lineStyle: { width: 3, color: "#0ea5e9" }, areaStyle: { color: "rgba(14,165,233,0.12)" } }] }} />
      </section>
    </div>
  );
}

export function ReportsWorkspace({ reports, runsByReport }: { reports: Array<Record<string, unknown>>; runsByReport: Record<string, Array<Record<string, unknown>>> }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const createReport = () => {
    const name = window.prompt("Report name");
    if (!name) return;
    startTransition(async () => {
      const response = await fetch("/api/v1/analytics/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, report_type: "executive", output_format: "excel", config: { kpi_codes: ["KPI_01", "KPI_04", "KPI_07"] } }) });
      if (!response.ok) {
        setMessage("Unable to create report.");
        return;
      }
      window.location.reload();
    });
  };

  const runReport = (id: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/analytics/reports/${id}/run`, { method: "POST" });
      if (!response.ok) {
        setMessage("Unable to queue report run.");
        return;
      }
      setMessage("Report run queued.");
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Create KPI packs, queue ad hoc runs, and download completed files.</p>
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={createReport}>Create Report</button>
      </section>
      {message ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Definitions</h2>
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <div key={String(report.id)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{String(report.name)}</p>
                    <p className="mt-1 text-sm text-slate-500">{String(report.report_type)} · {String(report.output_format)}</p>
                  </div>
                  <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={() => runReport(String(report.id))}>Run</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Run History</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(runsByReport).flatMap(([reportId, runs]) => runs.map((run) => (
              <div key={String(run.id)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Report {reportId.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-slate-500">Status: {String(run.status)} · {String(run.output_format)}</p>
                  </div>
                  {run.status === "completed" ? <a className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700" href={`/api/v1/analytics/reports/runs/${run.id}/download`}>Download</a> : null}
                </div>
              </div>
            )))}
          </div>
        </div>
      </section>
    </div>
  );
}
