"use client";

import { useState } from "react";
import { GitCompareArrows, Rocket, Sparkles } from "lucide-react";

type Scenario = {
  id: string;
  planning_cycle_id: string;
  name: string;
  description: string | null;
  status: string;
  branched_from_id: string | null;
  created_by: string | null;
};

type Metric = { label: string; left: number; right: number; delta: number };

export function PlanningScenarios({ scenarios }: { scenarios: Scenario[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<{ metrics: Metric[] } | null>(null);

  const canCompare = selected.length === 2;

  async function createScenario() {
    if (!name || scenarios.length === 0) {
      return;
    }
    await fetch("/api/v1/planning/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planning_cycle_id: scenarios[0].planning_cycle_id, name, description })
    });
  }

  async function compare() {
    if (!canCompare) {
      return;
    }
    const response = await fetch(`/api/v1/planning/scenarios/${selected[0]}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ other_scenario_id: selected[1] })
    });
    if (response.ok) {
      setComparison(await response.json());
    }
  }

  async function promote(id: string) {
    await fetch(`/api/v1/planning/scenarios/${id}/promote`, { method: "POST" });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Concurrent Planning</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Scenario Lab</h1>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Scenario name" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button type="button" onClick={() => void createScenario()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Create Scenario</button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const selectedState = selected.includes(scenario.id);
          return (
            <article key={scenario.id} className={`rounded-[28px] border p-5 shadow-sm ${selectedState ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{scenario.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{scenario.description ?? "No description provided."}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">{scenario.status}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Branched from: {scenario.branched_from_id ?? "Baseline"}</p>
                <p>Created by: {scenario.created_by ?? "System"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setSelected((current) => current.includes(scenario.id) ? current.filter((id) => id !== scenario.id) : [...current, scenario.id].slice(-2))} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <GitCompareArrows className="h-4 w-4" />
                  {selectedState ? "Selected" : "Select"}
                </button>
                <button type="button" onClick={() => void promote(scenario.id)} className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white">
                  <Rocket className="h-4 w-4" />
                  Promote
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Scenario Compare</h2>
            <p className="mt-1 text-sm text-slate-500">Select two scenarios to compare inventory value, planned order cost, and projected fill rate.</p>
          </div>
          <button type="button" onClick={() => void compare()} disabled={!canCompare} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
            <Sparkles className="h-4 w-4 text-sky-300" />
            Compare
          </button>
        </div>
        {comparison ? (
          <div className="mt-5 rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Metric</span>
              <span>Left</span>
              <span>Right</span>
              <span>Delta</span>
            </div>
            {comparison.metrics.map((metric) => (
              <div key={metric.label} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
                <span className="font-medium text-slate-950">{metric.label}</span>
                <span>{metric.left.toLocaleString()}</span>
                <span>{metric.right.toLocaleString()}</span>
                <span className={metric.delta >= 0 ? "text-emerald-600" : "text-rose-600"}>{metric.delta.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
