"use client";

import { useMemo, useState } from "react";

const badgeStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200"
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  country_code?: string | null;
  lead_time_days?: number | null;
  payment_terms_days?: number | null;
  risk_rating: "low" | "medium" | "high" | "critical";
  status: string;
  contact_email?: string | null;
};

export function SuppliersPage({ suppliers }: { suppliers: Supplier[] }) {
  const [rows, setRows] = useState(suppliers);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => rows.filter((supplier) => `${supplier.code} ${supplier.name}`.toLowerCase().includes(query.toLowerCase())), [query, rows]);

  async function updateRiskRating(id: string, riskRating: Supplier["risk_rating"]) {
    const response = await fetch(`/api/v1/master/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ risk_rating: riskRating })
    });

    if (!response.ok) {
      return;
    }

    const updated = (await response.json()) as Supplier;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Master Data</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Suppliers</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Track supplier master records, risk posture, and sourcing readiness in one place.</p>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier code or name" className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none lg:max-w-md" />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[120px_1.4fr_100px_140px_140px_160px_160px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span>Code</span>
          <span>Name</span>
          <span>Country</span>
          <span>Lead Time</span>
          <span>Terms</span>
          <span>Risk Rating</span>
          <span>Status</span>
        </div>
        {filtered.map((supplier) => (
          <div key={supplier.id} className="grid grid-cols-[120px_1.4fr_100px_140px_140px_160px_160px] items-center gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
            <span className="font-semibold text-slate-950">{supplier.code}</span>
            <div>
              <p className="font-medium">{supplier.name}</p>
              <p className="text-xs text-slate-500">{supplier.contact_email ?? "No contact email"}</p>
            </div>
            <span>{supplier.country_code ?? "-"}</span>
            <span>{supplier.lead_time_days ?? 0} days</span>
            <span>{supplier.payment_terms_days ?? 0} days</span>
            <select value={supplier.risk_rating} onChange={(event) => void updateRiskRating(supplier.id, event.target.value as Supplier["risk_rating"])} className={`rounded-full border px-3 py-2 text-xs font-semibold ${badgeStyles[supplier.risk_rating]}`}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">{supplier.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
