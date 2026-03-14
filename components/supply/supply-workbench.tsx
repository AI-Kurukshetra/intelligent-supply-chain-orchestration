"use client";

import { startTransition, useMemo, useState } from "react";
import { Download, Play, SquareCheckBig } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type PlanningCycle = { id: string; cycle_name: string; status: string; horizon_start: string; horizon_end: string; cycle_type: string };
type PlannedOrder = {
  id: string;
  product_id: string;
  facility_id: string;
  order_type: string;
  status: string;
  quantity: number;
  planned_start_date: string;
  planned_end_date: string;
  due_date: string;
  firm_planned: boolean;
  pegging: unknown;
};
type Product = { id: string; sku: string; name: string };

const orderColors: Record<string, string> = {
  production: "bg-sky-500",
  purchase: "bg-emerald-500",
  transfer: "bg-amber-500"
};

function dateDiffInDays(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function SupplyWorkbench({ cycles, selectedCycle, orders, products }: { cycles: PlanningCycle[]; selectedCycle: PlanningCycle | null; orders: PlannedOrder[]; products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"grid" | "gantt">("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localOrders, setLocalOrders] = useState(orders);
  const cycleStart = selectedCycle?.horizon_start ?? new Date().toISOString().slice(0, 10);
  const cycleEnd = selectedCycle?.horizon_end ?? cycleStart;
  const totalDays = Math.max(1, dateDiffInDays(cycleStart, cycleEnd));

  const rows = useMemo(
    () =>
      localOrders.map((order) => ({
        ...order,
        productLabel: products.find((product) => product.id === order.product_id)?.sku ?? order.product_id,
        productName: products.find((product) => product.id === order.product_id)?.name ?? "Unknown"
      })),
    [localOrders, products]
  );

  function syncCycle(cycleId: string) {
    startTransition(() => {
      router.replace(`${pathname}?cycle_id=${encodeURIComponent(cycleId)}`);
    });
  }

  async function runMrp() {
    if (!selectedCycle) {
      return;
    }
    await fetch("/api/v1/supply/mrp/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planning_cycle_id: selectedCycle.id })
    });
  }

  async function bulkFirm() {
    if (selectedIds.length === 0) {
      return;
    }
    await fetch("/api/v1/supply/planned-orders/bulk-firm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    setLocalOrders((current) => current.map((order) => (selectedIds.includes(order.id) ? { ...order, firm_planned: true, status: "firmed" } : order)));
    setSelectedIds([]);
  }

  function exportOrders() {
    const headers = ["due_date", "product", "qty", "type", "status"];
    const lines = rows.map((row) => [row.due_date, row.productLabel, row.quantity, row.order_type, row.status].join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `supply-planned-orders-${selectedCycle?.id ?? "cycle"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function shiftOrder(order: PlannedOrder, dayDelta: number) {
    if (dayDelta === 0 || order.status !== "planned" || order.firm_planned) {
      return;
    }
    const nextStart = new Date(`${order.planned_start_date}T00:00:00.000Z`);
    const nextEnd = new Date(`${order.planned_end_date}T00:00:00.000Z`);
    nextStart.setUTCDate(nextStart.getUTCDate() + dayDelta);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + dayDelta);
    await fetch(`/api/v1/supply/planned-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planned_start_date: nextStart.toISOString().slice(0, 10), planned_end_date: nextEnd.toISOString().slice(0, 10) })
    });
    setLocalOrders((current) =>
      current.map((candidate) =>
        candidate.id === order.id
          ? { ...candidate, planned_start_date: nextStart.toISOString().slice(0, 10), planned_end_date: nextEnd.toISOString().slice(0, 10) }
          : candidate
      )
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Supply Planning</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Workbench</h1>
            </div>
            <select value={selectedCycle?.id ?? ""} onChange={(event) => syncCycle(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>{cycle.cycle_name}</option>
              ))}
            </select>
            {selectedCycle ? (
              <div className="space-y-3">
                {[
                  ["Open", selectedCycle.status === "open"],
                  ["Running", selectedCycle.status === "running"],
                  ["Review", selectedCycle.status === "review"],
                  ["Approved", selectedCycle.status === "approved"],
                  ["Locked", selectedCycle.status === "locked"]
                ].map(([label, active]) => (
                  <div key={String(label)} className={`rounded-2xl px-4 py-3 text-sm font-medium ${active ? "bg-slate-950 text-white" : "bg-white text-slate-500"}`}>
                    {label}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void runMrp()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                <Play className="h-4 w-4" />
                Run MRP
              </button>
              <button type="button" onClick={() => void bulkFirm()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <SquareCheckBig className="h-4 w-4" />
                Bulk Firm
              </button>
              <button type="button" onClick={exportOrders} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button type="button" onClick={() => setView((current) => (current === "grid" ? "gantt" : "grid"))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                {view === "grid" ? "Gantt View" : "Grid View"}
              </button>
            </div>

            {view === "grid" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-[60px_120px_1.2fr_120px_130px_120px_140px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span />
                  <span>Due Date</span>
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span>Window</span>
                </div>
                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[60px_120px_1.2fr_120px_130px_120px_140px] gap-4 px-6 py-4 text-sm text-slate-700 odd:bg-slate-50/70">
                    <label className="flex items-center justify-center">
                      <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(event) => setSelectedIds((current) => (event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)))} />
                    </label>
                    <span>{row.due_date}</span>
                    <div>
                      <p className="font-medium text-slate-950">{row.productLabel}</p>
                      <p className="text-xs text-slate-500">{row.productName}</p>
                    </div>
                    <span>{row.quantity}</span>
                    <span className="capitalize">{row.order_type}</span>
                    <span>{row.status}</span>
                    <span>{row.planned_start_date} to {row.planned_end_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4">
                  {rows.map((row) => {
                    const offset = Math.max(0, dateDiffInDays(cycleStart, row.planned_start_date));
                    const span = Math.max(1, dateDiffInDays(row.planned_start_date, row.planned_end_date));
                    const leftPercent = (offset / totalDays) * 100;
                    const widthPercent = Math.max(4, (span / totalDays) * 100);
                    return (
                      <div key={row.id} className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{row.productLabel}</p>
                          <p className="text-xs text-slate-500">{row.order_type} • {row.status}</p>
                        </div>
                        <div className="relative h-14 rounded-2xl bg-slate-100">
                          <button
                            type="button"
                            draggable={row.status === "planned" && !row.firm_planned}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
                            onDragEnd={(event) => {
                              const pixels = event.clientX - event.currentTarget.getBoundingClientRect().left - event.currentTarget.offsetWidth / 2;
                              const ratio = pixels / Math.max(event.currentTarget.parentElement?.clientWidth ?? 1, 1);
                              const delta = Math.round(ratio * totalDays);
                              void shiftOrder(row, delta);
                            }}
                            className={`absolute top-2 h-10 rounded-xl px-3 text-left text-xs font-semibold text-white ${orderColors[row.order_type]}`}
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                          >
                            {row.quantity}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

