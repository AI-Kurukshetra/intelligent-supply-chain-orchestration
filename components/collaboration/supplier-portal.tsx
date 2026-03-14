"use client";

import { formatDistanceToNow } from "date-fns";
import { useMemo, useState, useTransition } from "react";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

type DashboardActivity = { id: string; text: string; created_at: string };

type SupplierDashboardProps = {
  supplierName: string;
  metrics: {
    open_po_count: number;
    submitted_capacity_periods: number;
    scorecard_grade: string;
    recent_activity: DashboardActivity[];
  };
};

export function SupplierDashboard({ supplierName, metrics }: SupplierDashboardProps) {
  const activity = useMemo(() => metrics.recent_activity ?? [], [metrics.recent_activity]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-r from-sky-950 via-slate-900 to-sky-800 p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-200">Supplier Portal</p>
        <h1 className="mt-3 text-3xl font-semibold">{supplierName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-sky-100">
          Manage purchase order confirmations, share capacity outlooks, and stay aligned with the monthly S&amp;OP rhythm.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open Purchase Orders" value={metrics.open_po_count} />
        <StatCard label="Submitted Capacity Periods" value={metrics.submitted_capacity_periods} />
        <StatCard label="Latest Scorecard Grade" value={metrics.scorecard_grade} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
        <div className="mt-5 space-y-3">
          {activity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No recent supplier activity yet.</div>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{item.text}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function SupplierOrdersPage({ orders }: { orders: Array<Record<string, unknown>> }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const respond = (orderId: string, payload: Record<string, unknown>) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/portal/orders/${orderId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { detail?: string } | null;
        setMessage(error?.detail ?? "Unable to update order.");
        return;
      }
      setMessage("Order response saved.");
      window.location.reload();
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Purchase Orders</h1>
        <p className="text-sm text-slate-500">Confirm quantities and due dates or reject orders with a reason.</p>
      </div>
      {message ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Confirmed</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const product = order.products as { sku?: string; name?: string } | null;
              const orderId = String(order.id);
              return (
                <tr key={orderId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{orderId.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-700">{product?.sku ?? "-"} � {product?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-slate-700">{Number(order.quantity ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{String(order.due_date ?? "-")}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{String(order.status ?? "planned")}</span></td>
                  <td className="px-4 py-3 text-slate-700">{order.confirmed_date ? `${order.confirmed_qty} on ${order.confirmed_date}` : "Pending"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => respond(orderId, { confirmed_qty: Number(order.quantity ?? 0), confirmed_date: String(order.due_date ?? ""), rejected: false })}
                      >
                        Confirm
                      </button>
                      <button
                        className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => {
                          const reason = window.prompt("Reason for rejection");
                          if (!reason) return;
                          respond(orderId, { rejected: true, reason });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SupplierCapacityPage({ submissions, products }: { submissions: Array<Record<string, unknown>>; products: Array<{ id: string; sku: string; name: string }> }) {
  const [form, setForm] = useState({ product_id: products[0]?.id ?? "", period_start: "", period_end: "", available_qty: "0", lead_time_days: "14", notes: "", status: "draft" });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const submit = () => {
    startTransition(async () => {
      const response = await fetch("/api/v1/portal/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          available_qty: Number(form.available_qty),
          lead_time_days: Number(form.lead_time_days)
        })
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { detail?: string } | null;
        setMessage(error?.detail ?? "Unable to save capacity submission.");
        return;
      }
      setMessage(form.status === "submitted" ? "Capacity submitted." : "Draft saved.");
      window.location.reload();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Capacity Outlook</h1>
          <p className="text-sm text-slate-500">Share four-week availability and lead time updates with planners.</p>
        </div>
        {message ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Product</span>
            <select className="w-full rounded-2xl border border-slate-300 px-3 py-2" value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}>
              {products.map((product) => <option key={product.id} value={product.id}>{product.sku} � {product.name}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Available Qty</span>
            <input className="w-full rounded-2xl border border-slate-300 px-3 py-2" type="number" value={form.available_qty} onChange={(event) => setForm((current) => ({ ...current, available_qty: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Period Start</span>
            <input className="w-full rounded-2xl border border-slate-300 px-3 py-2" type="date" value={form.period_start} onChange={(event) => setForm((current) => ({ ...current, period_start: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Period End</span>
            <input className="w-full rounded-2xl border border-slate-300 px-3 py-2" type="date" value={form.period_end} onChange={(event) => setForm((current) => ({ ...current, period_end: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Lead Time (days)</span>
            <input className="w-full rounded-2xl border border-slate-300 px-3 py-2" type="number" value={form.lead_time_days} onChange={(event) => setForm((current) => ({ ...current, lead_time_days: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Status</span>
            <select className="w-full rounded-2xl border border-slate-300 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft</option>
              <option value="submitted">Submit</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            <span>Notes</span>
            <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 px-3 py-2" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={submit}>
            {form.status === "submitted" ? "Submit Capacity" : "Save Draft"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Submission History</h2>
        <div className="mt-4 space-y-3">
          {submissions.map((submission) => {
            const product = submission.products as { sku?: string; name?: string } | null;
            return (
              <div key={String(submission.id)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{product?.sku ?? "-"} � {product?.name ?? "Product"}</p>
                    <p className="text-sm text-slate-500">{String(submission.period_start)} to {String(submission.period_end)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{String(submission.status)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Available: {Number(submission.available_qty ?? 0).toLocaleString()} � Lead Time: {Number(submission.lead_time_days ?? 0)} days</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
