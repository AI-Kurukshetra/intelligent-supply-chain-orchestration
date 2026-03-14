"use client";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { startTransition, useMemo, useState, type ChangeEvent } from "react";
import { AgGridReact } from "ag-grid-react";
import { ClientSideRowModelModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { Download, Play } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { EChartLine } from "@/components/charts/echart-line";
import type { Json } from "@/lib/supabase/types";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

type Facility = { id: string; code: string; name: string; type: string };
type ProductRow = Record<string, Json> & { id: string; sku: string; name: string; category: string | null };
type ChartPoint = { period: string; value: number };
type ChartSeries = { actual: ChartPoint[]; statistical: ChartPoint[]; consensus: ChartPoint[] };
type OverrideRow = { id: string; product_id: string; period_start: string; period_end: string; statistical_qty: number; proposed_qty: number; reason_code: string | null; reason: string | null; status: string };

type EChartSeries = { name: string; data: number[]; color?: string };

export function DemandWorkbench({
  facilities,
  initialFacilityId,
  initialHorizonWeeks,
  periods,
  rows,
  chartSeries,
  overrides,
  latestRun
}: {
  facilities: Facility[];
  initialFacilityId: string;
  initialHorizonWeeks: number;
  periods: string[];
  rows: ProductRow[];
  chartSeries: Record<string, ChartSeries>;
  overrides: OverrideRow[];
  latestRun: { id: string; status: string; created_at: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [facilityId, setFacilityId] = useState(initialFacilityId);
  const [horizonWeeks, setHorizonWeeks] = useState(initialHorizonWeeks);
  const [selectedRow, setSelectedRow] = useState<ProductRow | null>(rows[0] ?? null);
  const [editor, setEditor] = useState<{ product: ProductRow; periodIndex: number } | null>(null);
  const [proposedQty, setProposedQty] = useState(0);
  const [reasonCode, setReasonCode] = useState("promotion");
  const [reason, setReason] = useState("");
  const [runState, setRunState] = useState(latestRun?.status ?? "idle");

  const columnDefs = useMemo<ColDef<ProductRow>[]>(() => {
    const staticColumns: ColDef<ProductRow>[] = [
      { field: "sku", headerName: "Product SKU", pinned: "left", minWidth: 140 },
      { field: "name", headerName: "Product Name", pinned: "left", minWidth: 220 }
    ];

    const periodColumns = periods.map((period, index) => ({
      field: `P${index + 1}`,
      headerName: `W${index + 1}`,
      minWidth: 110,
      valueFormatter: (params: { value: number | null | undefined; data?: ProductRow }) => {
        const statistical = Number(params.data?.[`P${index + 1}_statistical`] ?? 0);
        const consensus = Number(params.value ?? 0);
        return `${consensus.toFixed(0)}${consensus !== statistical ? ` (${statistical.toFixed(0)})` : ""}`;
      },
      cellStyle: (params: { value: number | null | undefined; data?: ProductRow }) => {
        const statistical = Number(params.data?.[`P${index + 1}_statistical`] ?? 0);
        return {
          color: Number(params.value ?? 0) !== statistical ? "#0369a1" : "#475569",
          fontWeight: Number(params.value ?? 0) !== statistical ? 700 : 500
        };
      },
      headerTooltip: period
    } satisfies ColDef<ProductRow>));

    return [...staticColumns, ...periodColumns];
  }, [periods]);

  function syncFilters(nextFacilityId: string, nextHorizonWeeks: number) {
    startTransition(() => {
      router.replace(`${pathname}?facility_id=${encodeURIComponent(nextFacilityId)}&horizon_weeks=${nextHorizonWeeks}`);
    });
  }

  const selectedSeries = selectedRow ? chartSeries[selectedRow.id] : null;
  const categoryAxis = selectedSeries
    ? Array.from(
        new Set([
          ...selectedSeries.actual.map((point) => point.period),
          ...selectedSeries.statistical.map((point) => point.period),
          ...selectedSeries.consensus.map((point) => point.period)
        ])
      )
    : [];

  function openEditor(row: ProductRow, periodIndex: number) {
    setEditor({ product: row, periodIndex });
    setProposedQty(Number(row[`P${periodIndex + 1}`] ?? 0));
    setReasonCode(String(row[`P${periodIndex + 1}_reason`] ?? "promotion"));
    setReason("");
  }

  async function submitOverride() {
    if (!editor) {
      return;
    }

    const periodStart = String(editor.product[`P${editor.periodIndex + 1}_period_start`] ?? "");
    const periodEnd = String(editor.product[`P${editor.periodIndex + 1}_period_end`] ?? "");
    const statisticalQty = Number(editor.product[`P${editor.periodIndex + 1}_statistical`] ?? 0);
    await fetch("/api/v1/demand/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: editor.product.id,
        facility_id: facilityId,
        period_start: periodStart,
        period_end: periodEnd,
        statistical_qty: statisticalQty,
        proposed_qty: proposedQty,
        reason_code: reasonCode,
        reason
      })
    });
    setEditor(null);
  }

  async function runForecast() {
    setRunState("queued");
    await fetch("/api/v1/demand/forecasts/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facility_id: facilityId, horizon_weeks: horizonWeeks })
    });
  }

  function exportGrid() {
    const headers = ["sku", "name", ...periods.map((_, index) => `W${index + 1}`)];
    const lines = rows.map((row) => [row.sku, row.name, ...periods.map((_, index) => row[`P${index + 1}`])].join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `demand-workbench-${facilityId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const demandSeries: EChartSeries[] = selectedSeries
    ? [
        { name: "Actual", data: categoryAxis.map((period) => Number(selectedSeries.actual.find((point) => point.period === period)?.value ?? 0)), color: "#64748b" },
        { name: "Statistical", data: categoryAxis.map((period) => Number(selectedSeries.statistical.find((point) => point.period === period)?.value ?? 0)), color: "#94a3b8" },
        { name: "Consensus", data: categoryAxis.map((period) => Number(selectedSeries.consensus.find((point) => point.period === period)?.value ?? 0)), color: "#0ea5e9" }
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Demand Planning</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Demand Workbench</h1>
            <p className="mt-2 text-sm text-slate-500">Statistical and consensus demand planning by product and period.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={facilityId}
              onChange={(event) => {
                const nextValue = event.target.value;
                setFacilityId(nextValue);
                syncFilters(nextValue, horizonWeeks);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
            <select
              value={horizonWeeks}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setHorizonWeeks(nextValue);
                syncFilters(facilityId, nextValue);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value={13}>13W</option>
              <option value={26}>26W</option>
              <option value={52}>52W</option>
            </select>
            <button type="button" onClick={() => void runForecast()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              <Play className="h-4 w-4" />
              Run Forecast
            </button>
            <button type="button" onClick={exportGrid} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span>Latest run: {latestRun ? latestRun.id : "No runs yet"}</span>
          <span>Status: <span className="font-semibold text-slate-900">{runState}</span></span>
          <span>Pending overrides: {overrides.filter((row) => row.status === "pending").length}</span>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="ag-theme-quartz h-[480px] overflow-hidden rounded-3xl">
          <AgGridReact<ProductRow>
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true }}
            onRowClicked={(event: { data?: ProductRow }) => setSelectedRow(event.data ?? null)}
            onCellDoubleClicked={(event: { colDef: { field?: string | null }; data?: ProductRow }) => {
              if (!event.colDef.field?.startsWith("P") || event.colDef.field.includes("_")) {
                return;
              }
              const index = Number(event.colDef.field.replace("P", "")) - 1;
              if (event.data) {
                openEditor(event.data, index);
              }
            }}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Selected Product Forecast</h2>
          <p className="mt-1 text-sm text-slate-500">Actual history vs. statistical forecast vs. approved consensus.</p>
          {selectedSeries ? (
            <EChartLine categories={categoryAxis} series={demandSeries} />
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Select a product row to view its demand profile.</div>
          )}
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Override Queue</p>
          <div className="mt-4 space-y-3">
            {overrides.slice(0, 8).map((override) => (
              <div key={override.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="font-semibold">{override.status}</p>
                <p className="mt-1 text-slate-300">{override.reason_code ?? "No reason code"}</p>
                <p className="mt-2 text-slate-400">{override.period_start} -&gt; {override.proposed_qty}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Create Override</h3>
            <p className="mt-1 text-sm text-slate-500">{editor.product.sku} / W{editor.periodIndex + 1}</p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-slate-600">
                Proposed quantity
                <input type="number" value={proposedQty} onChange={(event: ChangeEvent<HTMLInputElement>) => setProposedQty(Number(event.target.value))} className="rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Reason code
                <select value={reasonCode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setReasonCode(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="promotion">Promotion</option>
                  <option value="new_customer">New customer</option>
                  <option value="lost_customer">Lost customer</option>
                  <option value="market_change">Market change</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Notes
                <textarea value={reason} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditor(null)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => void submitOverride()} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white">Submit override</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
