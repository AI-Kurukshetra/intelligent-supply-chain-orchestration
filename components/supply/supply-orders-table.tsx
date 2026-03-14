"use client";

import { useMemo, useState } from "react";

type PlannedOrder = {
  id: string;
  product_id: string;
  order_type: string;
  status: string;
  quantity: number;
  due_date: string;
  firm_planned: boolean;
  pegging: unknown;
};
type Product = { id: string; sku: string; name: string };

export function SupplyOrdersTable({ orders, products }: { orders: PlannedOrder[]; products: Product[] }) {
  const [rows, setRows] = useState(orders);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PlannedOrder | null>(null);

  const filtered = useMemo(() => rows.filter((row) => (!status || row.status === status) && (!type || row.order_type === type)), [rows, status, type]);

  async function firm(id: string) {
    const response = await fetch(`/api/v1/supply/planned-orders/${id}/firm`, { method: "POST" });
    if (!response.ok) return;
    const updated = (await response.json()) as PlannedOrder;
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  }

  async function cancel(id: string) {
    const response = await fetch(`/api/v1/supply/planned-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    if (!response.ok) return;
    const updated = (await response.json()) as PlannedOrder;
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  }

  const peggingEntries = Array.isArray(selectedOrder?.pegging) ? selectedOrder.pegging : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Supply Planning</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Planned Orders</h1>
        <div className="mt-5 flex gap-3">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All statuses</option>
            <option value="planned">Planned</option>
            <option value="firmed">Firmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All types</option>
            <option value="production">Production</option>
            <option value="purchase">Purchase</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[180px_120px_120px_120px_120px_260px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Product</span>
          <span>Due Date</span>
          <span>Qty</span>
          <span>Type</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.map((row) => {
          const product = products.find((item) => item.id === row.product_id);
          return (
            <div key={row.id} className="grid grid-cols-[180px_120px_120px_120px_120px_260px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
              <span className="font-medium text-slate-950">{product ? `${product.sku} - ${product.name}` : row.product_id}</span>
              <span>{row.due_date}</span>
              <span>{row.quantity}</span>
              <span>{row.order_type}</span>
              <span>{row.status}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => void firm(row.id)} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Firm</button>
                <button type="button" onClick={() => void cancel(row.id)} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white">Cancel</button>
                <button type="button" onClick={() => setSelectedOrder(row)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">View Pegging</button>
              </div>
            </div>
          );
        })}
      </section>

      {selectedOrder ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Pegging</h2>
            <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Close</button>
          </div>
          <div className="mt-5 space-y-3">
            {peggingEntries.length > 0 ? peggingEntries.map((item, index) => (
              <pre key={index} className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(item, null, 2)}</pre>
            )) : <p className="text-sm text-slate-500">No pegging data is available for this order.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
