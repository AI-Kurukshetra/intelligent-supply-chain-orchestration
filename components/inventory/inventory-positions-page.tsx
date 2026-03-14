"use client";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ClientSideRowModelModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { Boxes, PackageCheck, TriangleAlert } from "lucide-react";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

type Row = {
  id: string;
  product_id: string;
  facility_id: string;
  on_hand_qty: number;
  in_transit_qty: number;
  reserved_qty: number;
  safety_stock_qty: number;
  reorder_point_qty: number;
  available_qty: number;
  days_of_supply: number | null;
  product: { sku: string; name: string } | null;
  facility: { name: string } | null;
};

type ValueGetterParams = { data?: Row };
type ValueFormatterParams = { value: number | null | undefined };
type RowClassRuleParams = { data?: Row };
type RowClickedEvent = { data?: Row };

export function InventoryPositionsPage({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState({ transaction_type: "adjustment", quantity: 0, reason: "" });

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { field: "product.sku", headerName: "SKU", valueGetter: (params: ValueGetterParams) => params.data?.product?.sku ?? "" },
      { field: "product.name", headerName: "Name", minWidth: 220, valueGetter: (params: ValueGetterParams) => params.data?.product?.name ?? "" },
      { field: "facility.name", headerName: "Facility", valueGetter: (params: ValueGetterParams) => params.data?.facility?.name ?? "" },
      { field: "on_hand_qty", headerName: "On Hand" },
      { field: "in_transit_qty", headerName: "In Transit" },
      { field: "available_qty", headerName: "Available" },
      { field: "safety_stock_qty", headerName: "Safety Stock" },
      { field: "reorder_point_qty", headerName: "Reorder Point" },
      { field: "days_of_supply", headerName: "Days of Supply", valueFormatter: (params: ValueFormatterParams) => (params.value == null ? "-" : Number(params.value).toFixed(1)) }
    ],
    []
  );

  async function submitAdjustment() {
    if (!selected) {
      return;
    }
    await fetch("/api/v1/inventory/positions/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: selected.product_id,
        facility_id: selected.facility_id,
        transaction_type: form.transaction_type,
        quantity: Number(form.quantity),
        reason: form.reason
      })
    });
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Inventory Positions</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <Boxes className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-sm text-slate-300">Tracked positions</p>
            <p className="mt-1 text-3xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-3xl bg-amber-50 p-5 text-slate-900">
            <TriangleAlert className="h-5 w-5 text-amber-500" />
            <p className="mt-3 text-sm text-slate-500">Below reorder point</p>
            <p className="mt-1 text-3xl font-semibold">{rows.filter((row) => row.available_qty < row.reorder_point_qty).length}</p>
          </div>
          <div className="rounded-3xl bg-emerald-50 p-5 text-slate-900">
            <PackageCheck className="h-5 w-5 text-emerald-500" />
            <p className="mt-3 text-sm text-slate-500">Healthy positions</p>
            <p className="mt-1 text-3xl font-semibold">{rows.filter((row) => row.available_qty >= row.reorder_point_qty).length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="ag-theme-quartz h-[560px] overflow-hidden rounded-3xl">
          <AgGridReact<Row>
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1 }}
            rowClassRules={{
              "!bg-red-50": (params: RowClassRuleParams) => Number(params.data?.available_qty ?? 0) < Number(params.data?.safety_stock_qty ?? 0),
              "!bg-amber-50": (params: RowClassRuleParams) => Number(params.data?.available_qty ?? 0) >= Number(params.data?.safety_stock_qty ?? 0) && Number(params.data?.available_qty ?? 0) < Number(params.data?.reorder_point_qty ?? 0),
              "!bg-emerald-50": (params: RowClassRuleParams) => Number(params.data?.available_qty ?? 0) >= Number(params.data?.reorder_point_qty ?? 0)
            }}
            onRowClicked={(event: RowClickedEvent) => setSelected(event.data ?? null)}
          />
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Adjust Inventory</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.product?.sku} at {selected.facility?.name}</p>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-600">
              Transaction type
              <select className="rounded-2xl border border-slate-200 px-4 py-3" value={form.transaction_type} onChange={(event) => setForm((current) => ({ ...current, transaction_type: event.target.value }))}>
                <option value="adjustment">Adjustment</option>
                <option value="receipt">Receipt</option>
                <option value="issue">Issue</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="cycle_count">Cycle Count</option>
                <option value="return">Return</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Quantity delta
              <input type="number" className="rounded-2xl border border-slate-200 px-4 py-3" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Reason
              <textarea className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </label>
            <button type="button" onClick={() => void submitAdjustment()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Apply adjustment</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
