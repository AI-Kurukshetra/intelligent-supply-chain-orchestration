"use client";

import { useState } from "react";
import { Play } from "lucide-react";

type PlanningCycle = { id: string; cycle_name: string; status: string; horizon_start: string; horizon_end: string };
type MrpRun = { id: string; planning_cycle_id: string; status: string; total_products: number; processed_products: number; failed_products: number; created_at: string };
type MrpMessage = { id: string; severity: string; title: string; detail: string | null; message_type: string };

export function SupplyMrpDashboard({ cycles, runs, selectedRun, messages }: { cycles: PlanningCycle[]; runs: MrpRun[]; selectedRun: MrpRun | null; messages: MrpMessage[] }) {
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? "");
  const grouped = messages.reduce<Record<string, MrpMessage[]>>((accumulator, message) => {
    const bucket = accumulator[message.severity] ?? [];
    bucket.push(message);
    accumulator[message.severity] = bucket;
    return accumulator;
  }, {});

  async function triggerRun() {
    if (!cycleId) {
      return;
    }
    await fetch("/api/v1/supply/mrp/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planning_cycle_id: cycleId }) });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Supply Planning</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">MRP Runs</h1>
          </div>
          <div className="flex gap-3">
            <select value={cycleId} onChange={(event) => setCycleId(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.cycle_name}</option>)}
            </select>
            <button type="button" onClick={() => void triggerRun()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              <Play className="h-4 w-4" />
              Trigger Run
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[220px_160px_160px_160px_160px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Run</span>
          <span>Status</span>
          <span>Total Products</span>
          <span>Processed</span>
          <span>Failed</span>
        </div>
        {runs.map((run) => (
          <a key={run.id} href={`/supply/mrp?run_id=${run.id}`} className="grid grid-cols-[220px_160px_160px_160px_160px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
            <span className="font-medium text-slate-950">{run.id.slice(0, 8)}</span>
            <span>{run.status}</span>
            <span>{run.total_products}</span>
            <span>{run.processed_products}</span>
            <span>{run.failed_products}</span>
          </a>
        ))}
      </section>

      {selectedRun ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Run Detail</h2>
          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([severity, severityMessages]) => (
              <details key={severity} className="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">{severity.toUpperCase()} ({severityMessages.length})</summary>
                <div className="mt-3 space-y-3">
                  {severityMessages.map((message) => (
                    <div key={message.id} className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">{message.title}</p>
                      <p className="mt-1 text-slate-500">{message.detail ?? message.message_type}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
