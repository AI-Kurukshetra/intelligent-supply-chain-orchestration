"use client";

import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

export function DataGrid<TData extends object>({ rowData, columnDefs, height = 520 }: { rowData: TData[]; columnDefs: ColDef<TData>[]; height?: number }) {
  return (
    <div className="ag-theme-alpine rounded-3xl border border-slate-200 bg-white shadow-sm" style={{ height }}>
      <AgGridReact<TData>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, filter: true, resizable: true }}
        animateRows
        suppressCellFocus
      />
    </div>
  );
}
