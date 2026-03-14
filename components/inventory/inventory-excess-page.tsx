"use client";

import ReactECharts from "echarts-for-react";

type Row = {
  id: string;
  on_hand_qty: number;
  facility: { name: string } | null;
  product: { sku: string; name: string; category: string | null } | null;
  weeks_of_supply: number;
  excess_value_cents: number;
  recommendation: string;
  category_color: string;
};

export function InventoryExcessPage({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Excess & Obsolete</h1>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <ReactECharts
          style={{ height: 420 }}
          option={{
            tooltip: { formatter: "{b}: ${c}" },
            series: [
              {
                type: "treemap",
                roam: false,
                label: { show: true, formatter: "{b}" },
                data: rows.map((row) => ({
                  name: `${row.product?.sku ?? row.id} · ${row.facility?.name ?? row.id}`,
                  value: Number((row.excess_value_cents / 100).toFixed(2)),
                  itemStyle: { color: row.category_color }
                }))
              }
            ]
          }}
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[180px_180px_140px_140px_160px_1fr] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Product</span>
          <span>Facility</span>
          <span>On Hand</span>
          <span>Weeks of Supply</span>
          <span>Excess Value</span>
          <span>Recommendation</span>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[180px_180px_140px_140px_160px_1fr] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
            <span className="font-medium text-slate-950">{row.product?.sku} - {row.product?.name}</span>
            <span>{row.facility?.name}</span>
            <span>{row.on_hand_qty}</span>
            <span>{row.weeks_of_supply}</span>
            <span>${(row.excess_value_cents / 100).toLocaleString()}</span>
            <span>{row.recommendation}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
