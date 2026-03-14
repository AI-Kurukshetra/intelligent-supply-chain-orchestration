"use client";

import { useMemo, useState } from "react";

import {
  calculateEOQ,
  calculateReorderPoint,
  calculateSafetyStock
} from "@/lib/inventory/optimization";

type Policy = {
  id: string;
  service_level_pct: number;
  lead_time_days: number;
  holding_cost_pct: number;
  ordering_cost_cents: number;
  calculated_safety_stock: number | null;
  calculated_rop: number | null;
  calculated_eoq: number | null;
  product: { sku: string; name: string } | null;
  facility: { name: string } | null;
};

export function InventoryOptimizationPage({ policies }: { policies: Policy[] }) {
  const baseline = policies[0] ?? null;
  const [serviceLevel, setServiceLevel] = useState(baseline?.service_level_pct ?? 95);

  const proposed = useMemo(() => {
    if (!baseline) {
      return { safetyStock: 0, reorderPoint: 0, eoq: 0 };
    }
    const dailyDemand = Math.max(Number(baseline.calculated_rop ?? 0) / Math.max(baseline.lead_time_days, 1), 1);
    const safetyStock = calculateSafetyStock({
      serviceLevelPct: serviceLevel,
      leadTimeDays: baseline.lead_time_days,
      leadTimeVariabilityDays: Math.max(baseline.lead_time_days * 0.15, 1),
      demandAvgPerDay: dailyDemand,
      demandStdPerDay: Math.max(dailyDemand * 0.35, 1)
    });
    const reorderPoint = calculateReorderPoint(dailyDemand, baseline.lead_time_days, safetyStock);
    const eoq = calculateEOQ({
      annualDemand: dailyDemand * 365,
      orderingCostCents: baseline.ordering_cost_cents,
      unitCostCents: 10000,
      holdingCostPct: baseline.holding_cost_pct
    });
    return { safetyStock, reorderPoint, eoq };
  }, [baseline, serviceLevel]);

  async function applyToAll() {
    await fetch("/api/v1/inventory/policies/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_level_pct: serviceLevel })
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Policy Optimization</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Tune service levels and compare the current calculated policy against a proposed target before applying changes across the tenant.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Service Level</p>
          <p className="mt-2 text-4xl font-semibold">{serviceLevel.toFixed(1)}%</p>
          <input type="range" min={85} max={99.9} step={0.1} value={serviceLevel} onChange={(event) => setServiceLevel(Number(event.target.value))} className="mt-6 w-full" />
          <button type="button" onClick={() => void applyToAll()} className="mt-8 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white">Apply to All</button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Policy</p>
            {baseline ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-950">Item:</span> {baseline.product?.sku} / {baseline.facility?.name}</p>
                <p><span className="font-semibold text-slate-950">Safety Stock:</span> {Number(baseline.calculated_safety_stock ?? 0).toFixed(2)}</p>
                <p><span className="font-semibold text-slate-950">Reorder Point:</span> {Number(baseline.calculated_rop ?? 0).toFixed(2)}</p>
                <p><span className="font-semibold text-slate-950">EOQ:</span> {Number(baseline.calculated_eoq ?? 0).toFixed(2)}</p>
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">No policies are available yet.</p>}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-emerald-50 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Proposed Policy</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-950">Safety Stock:</span> {proposed.safetyStock.toFixed(2)}</p>
              <p><span className="font-semibold text-slate-950">Reorder Point:</span> {proposed.reorderPoint.toFixed(2)}</p>
              <p><span className="font-semibold text-slate-950">EOQ:</span> {proposed.eoq.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Policy Catalog</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <article key={policy.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{policy.product?.sku} · {policy.facility?.name}</p>
              <p className="mt-2 text-sm text-slate-500">SS {Number(policy.calculated_safety_stock ?? 0).toFixed(1)} · ROP {Number(policy.calculated_rop ?? 0).toFixed(1)} · EOQ {Number(policy.calculated_eoq ?? 0).toFixed(1)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
