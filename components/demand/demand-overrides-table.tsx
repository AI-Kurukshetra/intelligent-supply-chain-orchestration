"use client";

import { useState } from "react";

type OverrideRow = {
  id: string;
  product_id: string;
  period_start: string;
  period_end: string;
  proposed_qty: number;
  statistical_qty: number;
  reason_code: string | null;
  reason: string | null;
  status: string;
};

type Product = { id: string; sku: string; name: string };

export function DemandOverridesTable({ initialOverrides, products }: { initialOverrides: OverrideRow[]; products: Product[] }) {
  const [rows, setRows] = useState(initialOverrides);
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const filtered = rows.filter((row) => (!statusFilter || row.status === statusFilter) && (!productFilter || row.product_id === productFilter));

  async function approve(id: string) {
    const response = await fetch(`/api/v1/demand/overrides/${id}/approve`, { method: "POST" });
    if (!response.ok) {
      return;
    }
    const updated = (await response.json()) as OverrideRow;
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  }

  async function reject(id: string) {
    const response = await fetch(`/api/v1/demand/overrides/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: "Rejected from override queue" })
    });
    if (!response.ok) {
      return;
    }
    const updated = (await response.json()) as OverrideRow;
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Demand Overrides</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Override Queue</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All products</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[200px_130px_130px_120px_120px_150px_1fr_220px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Product</span>
          <span>Start</span>
          <span>End</span>
          <span>Statistical</span>
          <span>Proposed</span>
          <span>Status</span>
          <span>Reason</span>
          <span>Actions</span>
        </div>
        {filtered.map((row) => {
          const product = products.find((item) => item.id === row.product_id);
          return (
            <div key={row.id} className="grid grid-cols-[200px_130px_130px_120px_120px_150px_1fr_220px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
              <span className="font-medium text-slate-950">{product ? `${product.sku} - ${product.name}` : row.product_id}</span>
              <span>{row.period_start}</span>
              <span>{row.period_end}</span>
              <span>{row.statistical_qty}</span>
              <span className="font-semibold text-sky-700">{row.proposed_qty}</span>
              <span>{row.status}</span>
              <span>{row.reason_code ?? row.reason ?? "-"}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => void approve(row.id)} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Approve</button>
                <button type="button" onClick={() => void reject(row.id)} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white">Reject</button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
