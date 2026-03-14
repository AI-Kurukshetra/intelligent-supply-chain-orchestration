"use client";

import ReactECharts from "echarts-for-react";
import { useState, useTransition } from "react";

export type ScorecardRecord = {
  id: string;
  score_month: number;
  score_year: number;
  otif_pct: number;
  lead_time_adherence_pct: number;
  composite_score: number;
  grade: string;
};

export type CycleDetail = {
  cycle: Record<string, unknown>;
  steps: readonly string[];
  actions: Array<Record<string, unknown>>;
};

export type SupplierSummary = {
  id: string;
  name: string;
  country_code: string | null;
  risk_rating: string;
  last_scorecard_grade: string;
  otif_pct: number;
};

export type CapacityGapRow = {
  period: string;
  demand_qty: number;
  submitted_capacity: number;
};

export type CapacitySubmissionRow = Record<string, unknown> & {
  id: string;
  supplier_id: string;
  status: string;
  period_start: string;
  period_end: string;
  available_qty: number;
  products?: { sku?: string; name?: string } | null;
};

export function SupplierScorecardPage({ scorecards }: { scorecards: ScorecardRecord[] }) {
  const latest = scorecards[0];
  const categories = [...scorecards].reverse().map((item) => `${item.score_month}/${item.score_year}`);
  const leadTimeData = [...scorecards].reverse().map((item) => item.lead_time_adherence_pct);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Supplier Scorecard</h1>
        <p className="mt-1 text-sm text-slate-500">Monthly service performance and adherence trends.</p>
        <div className="mt-6 flex items-center justify-center">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-slate-100">
            <div className="absolute inset-4 rounded-full border-[18px] border-sky-500/25" />
            <div className="text-center">
              <p className="text-5xl font-semibold text-slate-900">{Math.round(latest?.otif_pct ?? 0)}%</p>
              <p className="mt-2 text-sm text-slate-500">OTIF</p>
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Lead Time Adherence</h2>
        <ReactECharts
          style={{ height: 320 }}
          option={{
            tooltip: { trigger: "axis" },
            grid: { left: 24, right: 16, top: 24, bottom: 24, containLabel: true },
            xAxis: { type: "category", data: categories },
            yAxis: { type: "value", max: 100 },
            series: [{ type: "bar", data: leadTimeData, itemStyle: { color: "#0ea5e9", borderRadius: [8, 8, 0, 0] } }]
          }}
        />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
        <h2 className="text-xl font-semibold text-slate-900">Monthly History</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">OTIF</th>
                <th className="px-4 py-3">Lead Time</th>
                <th className="px-4 py-3">Composite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scorecards.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{item.score_month}/{item.score_year}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.grade}</td>
                  <td className="px-4 py-3 text-slate-700">{item.otif_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.lead_time_adherence_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-700">{item.composite_score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function SopWorkspace({ cycles, initialDetail }: { cycles: Array<Record<string, unknown>>; initialDetail: CycleDetail | null }) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(String(initialDetail?.cycle.id ?? cycles[0]?.id ?? ""));
  const [detail, setDetail] = useState<CycleDetail | null>(initialDetail);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const steps = ["statistical_forecast", "demand_review", "supply_review", "financial_reconciliation", "executive_review"];

  const refresh = (cycleId: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/sop/${cycleId}`);
      if (!response.ok) return;
      const data = (await response.json()) as CycleDetail;
      setDetail(data);
    });
  };

  const advance = () => {
    if (!selectedCycleId) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/sop/${selectedCycleId}/advance`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) {
        setMessage(data?.detail ?? "Unable to advance cycle.");
        return;
      }
      setMessage("S&OP cycle advanced.");
      refresh(selectedCycleId);
    });
  };

  const downloadPack = () => {
    if (!selectedCycleId) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/sop/${selectedCycleId}/meeting-pack`);
      const data = (await response.json()) as { url?: string; detail?: string };
      if (!response.ok || !data.url) {
        setMessage(data.detail ?? "Unable to generate meeting pack.");
        return;
      }
      setMessage("Meeting pack ready in a new tab.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    });
  };

  const createAction = () => {
    if (!selectedCycleId) return;
    const title = window.prompt("Action item title");
    if (!title) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/sop/${selectedCycleId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority: "medium" })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        setMessage(data?.detail ?? "Unable to create action.");
        return;
      }
      setMessage("Action created.");
      refresh(selectedCycleId);
    });
  };

  const updateAction = (actionId: string, status: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/sop/${selectedCycleId}/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) return;
      refresh(selectedCycleId);
    });
  };

  const currentStep = String(detail?.cycle.status ?? "statistical_forecast");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">S&OP Control Tower</h1>
            <p className="text-sm text-slate-500">Advance the monthly cycle, manage actions, and publish the meeting pack.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-full border border-slate-300 px-4 py-2 text-sm" value={selectedCycleId} onChange={(event) => { setSelectedCycleId(event.target.value); refresh(event.target.value); }}>
              {cycles.map((cycle) => <option key={String(cycle.id)} value={String(cycle.id)}>{String(cycle.cycle_name)} � {String(cycle.status)}</option>)}
            </select>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={advance}>Advance Step</button>
            <button className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={downloadPack}>Meeting Pack</button>
          </div>
        </div>
        {message ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const stepIndex = steps.indexOf(currentStep);
            const complete = stepIndex > index;
            const active = currentStep === step;
            return (
              <div key={step} className={`rounded-2xl border px-4 py-4 ${active ? "border-sky-500 bg-sky-50" : complete ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{step.replaceAll("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Current Step Focus</h2>
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            {currentStep === "statistical_forecast" ? "Refresh the statistical baseline, review model drift, and push the updated forecast into demand review." : null}
            {currentStep === "demand_review" ? "Validate consensus overrides, align on key promotions, and close demand-side action items." : null}
            {currentStep === "supply_review" ? "Review plan attainment by facility, supplier capacity gaps, and critical shortages before financial reconciliation." : null}
            {currentStep === "financial_reconciliation" ? "Check revenue, margin, and working-capital impacts before the executive review." : null}
            {currentStep === "executive_review" ? "Package decisions, finalize commitments, and prepare approvals for publishing." : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/demand" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Open Demand Workbench</a>
            <a href="/supply" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Open Supply Planning</a>
            <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={createAction}>New Action</button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Actions</h2>
          <div className="mt-4 space-y-3">
            {(detail?.actions ?? []).map((action) => (
              <div key={String(action.id)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{String(action.title)}</p>
                    <p className="mt-1 text-sm text-slate-500">Priority: {String(action.priority ?? "medium")} � Due: {String(action.due_date ?? "TBD")}</p>
                  </div>
                  <select className="rounded-full border border-slate-300 px-3 py-1.5 text-xs" value={String(action.status ?? "open")} onChange={(event) => updateAction(String(action.id), event.target.value)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function SupplierPlannerPage({ suppliers, submissionsBySupplier, initialGap }: { suppliers: SupplierSummary[]; submissionsBySupplier: CapacitySubmissionRow[]; initialGap: CapacityGapRow[] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id ?? "");
  const [gapData, setGapData] = useState<CapacityGapRow[]>(initialGap);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshGap = (supplierId: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/suppliers/${supplierId}/capacity-gap`);
      if (!response.ok) return;
      const data = (await response.json()) as { data: CapacityGapRow[] };
      setGapData(data.data);
    });
  };

  const acknowledge = (supplierId: string, submissionId: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/collaboration/suppliers/${supplierId}/capacity/${submissionId}/acknowledge`, { method: "POST" });
      if (!response.ok) {
        setMessage("Unable to acknowledge capacity submission.");
        return;
      }
      setMessage("Capacity submission acknowledged.");
      window.location.reload();
    });
  };

  const selectedSubmissions = submissionsBySupplier.filter((submission) => submission.supplier_id === selectedSupplierId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Supplier Collaboration</h1>
            <p className="text-sm text-slate-500">Monitor service health, review capacity signals, and resolve supplier-side gaps.</p>
          </div>
          <select className="rounded-full border border-slate-300 px-4 py-2 text-sm" value={selectedSupplierId} onChange={(event) => { setSelectedSupplierId(event.target.value); refreshGap(event.target.value); }}>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>
        {message ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">OTIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className={selectedSupplierId === supplier.id ? "bg-sky-50" : undefined}>
                  <td className="px-4 py-3 font-medium text-slate-900">{supplier.name}</td>
                  <td className="px-4 py-3 text-slate-700">{supplier.country_code ?? "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">{supplier.risk_rating}</span></td>
                  <td className="px-4 py-3 text-slate-700">{supplier.last_scorecard_grade}</td>
                  <td className="px-4 py-3 text-slate-700">{supplier.otif_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Capacity vs Demand</h2>
          <p className="mt-1 text-sm text-slate-500">{selectedSupplier?.name ?? "Supplier"} gap profile by period.</p>
          <ReactECharts
            style={{ height: 320 }}
            option={{
              tooltip: { trigger: "axis" },
              legend: { top: 0 },
              grid: { left: 24, right: 16, top: 40, bottom: 24, containLabel: true },
              xAxis: { type: "category", data: gapData.map((row) => row.period) },
              yAxis: { type: "value" },
              series: [
                { name: "Demand", type: "bar", data: gapData.map((row) => row.demand_qty), itemStyle: { color: "#1e3a5f" } },
                { name: "Capacity", type: "bar", data: gapData.map((row) => row.submitted_capacity), itemStyle: { color: "#10b981" } }
              ]
            }}
          />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Pending Capacity Submissions</h2>
          <div className="mt-4 space-y-3">
            {selectedSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{submission.products?.sku ?? "-"} � {submission.products?.name ?? "Product"}</p>
                    <p className="mt-1 text-sm text-slate-500">{submission.period_start} to {submission.period_end} � Qty {submission.available_qty.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{submission.status}</span>
                    {submission.status === "submitted" ? (
                      <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={() => acknowledge(selectedSupplierId, submission.id)}>Acknowledge</button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

