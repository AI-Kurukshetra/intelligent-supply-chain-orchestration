"use client";

import { useMemo, useState } from "react";

import { useExceptionQueue, type ExceptionQueueItem } from "@/hooks/useExceptionQueue";

function severityClass(severity: string) {
  if (severity === "critical") return "bg-rose-100 text-rose-700";
  if (severity === "high") return "bg-orange-100 text-orange-700";
  if (severity === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function ExceptionsQueuePage({ tenantId, initialItems }: { tenantId: string; initialItems: ExceptionQueueItem[] }) {
  const { items, setItems } = useExceptionQueue(tenantId, initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<ExceptionQueueItem | null>(null);
  const [filters, setFilters] = useState({ type: "", severity: "", status: "" });
  const [comment, setComment] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState("");

  const filtered = useMemo(
    () => items.filter((item) => (!filters.type || item.exception_type === filters.type) && (!filters.severity || item.severity === filters.severity) && (!filters.status || item.status === filters.status)),
    [filters, items]
  );

  async function bulkResolve() {
    if (selectedIds.length === 0) return;
    const response = await fetch("/api/v1/exceptions/bulk-resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, resolution_notes: resolutionNotes, resolution_action: resolutionAction })
    });
    if (!response.ok) return;
    setItems((current) => current.map((item) => selectedIds.includes(item.id) ? { ...item, status: "resolved" } : item));
    setSelectedIds([]);
  }

  async function resolveSelected() {
    if (!selected) return;
    const response = await fetch(`/api/v1/exceptions/${selected.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_notes: resolutionNotes, resolution_action: resolutionAction })
    });
    if (!response.ok) return;
    const next = await response.json() as ExceptionQueueItem;
    setItems((current) => current.map((item) => item.id === selected.id ? next : item));
    setSelected(next);
  }

  async function addComment() {
    if (!selected || !comment) return;
    await fetch(`/api/v1/exceptions/${selected.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment })
    });
    setComment("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Exception Management</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Exception Queue</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Type" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} />
          <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}>
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="suppressed">Suppressed</option>
            <option value="resolved">Resolved</option>
          </select>
          <button type="button" onClick={() => void bulkResolve()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Resolve Selected</button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5">
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="mt-1" />
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelected(item)}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${severityClass(item.severity)}`}>{item.severity}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.exception_type}</span>
                    <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{item.entity_name ?? item.entity_id ?? "Unknown entity"}</p>
                  <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                  <details className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <summary className="cursor-pointer font-semibold text-slate-900">AI recommendation</summary>
                    <p className="mt-2">{item.ai_recommendation ?? "No AI recommendation available yet."}</p>
                  </details>
                </div>
              </div>
            </article>
          ))}
        </div>

        {selected ? (
          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">{selected.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{selected.description}</p>
            <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selected.context_json, null, 2)}</pre>
            </div>
            <div className="mt-5 grid gap-3">
              <textarea className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Resolution notes" value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Resolution action" value={resolutionAction} onChange={(event) => setResolutionAction(event.target.value)} />
              <button type="button" onClick={() => void resolveSelected()} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white">Resolve Exception</button>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-950">Comments</h3>
              <textarea className="mt-3 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Add comment" value={comment} onChange={(event) => setComment(event.target.value)} />
              <button type="button" onClick={() => void addComment()} className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Add Comment</button>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
