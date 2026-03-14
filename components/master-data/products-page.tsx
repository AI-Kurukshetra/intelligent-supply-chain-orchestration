"use client";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, type ColDef, type GridReadyEvent, type IServerSideDatasource, type IServerSideGetRowsParams } from "ag-grid-community";
import { ServerSideRowModelModule } from "ag-grid-enterprise";
import { Download, Search, Upload } from "lucide-react";

import { formatCurrency } from "@/lib/utils/format";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  uom: string;
  lead_time_days: number;
  standard_cost_cents: number;
  currency_code: string;
  status: string;
  description: string | null;
  created_at: string;
};

type ProductDetail = {
  product: ProductRow;
  active_bom_header: {
    id: string;
    version: string;
    status: string;
    effective_from: string | null;
    effective_to: string | null;
  } | null;
  approved_supplier_count: number;
};

type ProductSearchResponse = {
  data: ProductRow[];
  next_cursor: string | null;
  has_more: boolean;
};

type ProductsPageProps = {
  initialRows: ProductRow[];
  initialSearch: string;
  initialStatus: string;
  initialCategory: string;
};

type ValueFormatterParams = {
  value: number | string | null | undefined;
  data?: ProductRow;
};

type RowClickedEvent = {
  data?: ProductRow;
};

const PAGE_SIZE = 25;

ModuleRegistry.registerModules([ServerSideRowModelModule]);

export function ProductsPage({ initialRows, initialSearch, initialStatus, initialCategory }: ProductsPageProps) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState(initialCategory);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact<ProductRow>>(null);

  const columnDefs = useMemo<ColDef<ProductRow>[]>(
    () => [
      { field: "sku", headerName: "SKU", minWidth: 130, pinned: "left" },
      { field: "name", headerName: "Name", minWidth: 220, flex: 1 },
      { field: "category", headerName: "Category", minWidth: 160 },
      { field: "uom", headerName: "UoM", minWidth: 100 },
      { field: "lead_time_days", headerName: "Lead Time", minWidth: 120 },
      {
        field: "standard_cost_cents",
        headerName: "Standard Cost",
        minWidth: 160,
        valueFormatter: (params: ValueFormatterParams) => formatCurrency(Number(params.value ?? 0), params.data?.currency_code ?? "USD")
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        valueFormatter: (params: ValueFormatterParams) => String(params.value ?? "")
      }
    ],
    []
  );

  const datasource = useMemo<IServerSideDatasource<ProductRow>>(() => {
    const pageCache = new Map<number, ProductRow[]>();
    const hasMoreCache = new Map<number, boolean>();
    pageCache.set(0, initialRows);
    hasMoreCache.set(0, initialRows.length >= PAGE_SIZE);

    const fetchPage = async (pageIndex: number): Promise<ProductRow[]> => {
      if (pageCache.has(pageIndex)) {
        return pageCache.get(pageIndex) ?? [];
      }

      for (let current = 0; current < pageIndex; current += 1) {
        if (pageCache.has(current + 1) || hasMoreCache.get(current) === false) {
          continue;
        }

        const previousRows = pageCache.get(current) ?? [];
        const cursor = previousRows.at(-1)?.created_at ?? null;
        const response = await fetch(
          `/api/v1/master/products?limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Unable to load products.");
        }
        const payload = (await response.json()) as ProductSearchResponse;
        pageCache.set(current + 1, payload.data);
        hasMoreCache.set(current + 1, payload.has_more);
      }

      return pageCache.get(pageIndex) ?? [];
    };

    return {
      getRows: async (params: IServerSideGetRowsParams<ProductRow>) => {
        try {
          const pageIndex = Math.floor((params.request.startRow ?? 0) / PAGE_SIZE);
          const rows = await fetchPage(pageIndex);
          const lastRow = rows.length < PAGE_SIZE ? pageIndex * PAGE_SIZE + rows.length : undefined;
          params.success({ rowData: rows, rowCount: lastRow });
        } catch (error) {
          params.fail();
          setDetailError(error instanceof Error ? error.message : "Unable to load products.");
        }
      }
    };
  }, [category, initialRows, search, status]);

  async function handleRowClick(productId: string) {
    setDetailError(null);
    const response = await fetch(`/api/v1/master/products/${productId}`, { cache: "no-store" });
    if (!response.ok) {
      setDetailError("Unable to load product details.");
      return;
    }
    setSelectedProduct((await response.json()) as ProductDetail);
  }

  function refreshGrid() {
    gridRef.current?.api?.refreshServerSide({ purge: true });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Master Data</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Products</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Search, import, and govern the product catalog feeding demand, supply, and planning workflows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/v1/master/products/export" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:text-sky-700">
              <Download className="h-4 w-4" />
              Export
            </a>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              <Upload className="h-4 w-4" />
              Import
              <input
                className="hidden"
                type="file"
                accept=".xlsx"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const formData = new FormData();
                  formData.append("file", file);
                  await fetch("/api/v1/master/products/import", { method: "POST", body: formData });
                  refreshGrid();
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1.5fr_220px_220px_120px]">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by SKU, name, or description" className="w-full bg-transparent outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="new">New</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none" />
          <button type="button" onClick={refreshGrid} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600">
            Apply
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="ag-theme-quartz h-[620px] w-full overflow-hidden rounded-3xl">
            <AgGridReact<ProductRow>
              ref={gridRef}
              columnDefs={columnDefs}
              rowModelType="serverSide"
              serverSideDatasource={datasource}
              pagination
              paginationPageSize={PAGE_SIZE}
              cacheBlockSize={PAGE_SIZE}
              defaultColDef={{ sortable: true, resizable: true, filter: false }}
              suppressAggFuncInHeader
              onGridReady={(event: GridReadyEvent<ProductRow>) => {
                event.api.setGridOption("serverSideDatasource", datasource);
              }}
              onRowClicked={(event: RowClickedEvent) => {
                if (event.data?.id) {
                  void handleRowClick(event.data.id);
                }
              }}
            />
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Product Detail</p>
          {detailError ? <p className="mt-4 text-sm text-red-300">{detailError}</p> : null}
          {selectedProduct ? (
            <div className="mt-4 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold">{selectedProduct.product.name}</h2>
                <p className="mt-1 text-sm text-slate-300">{selectedProduct.product.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Category" value={selectedProduct.product.category ?? "Unassigned"} />
                <Metric label="UoM" value={selectedProduct.product.uom} />
                <Metric label="Lead Time" value={`${selectedProduct.product.lead_time_days} days`} />
                <Metric label="Cost" value={formatCurrency(selectedProduct.product.standard_cost_cents, selectedProduct.product.currency_code)} />
                <Metric label="Suppliers" value={String(selectedProduct.approved_supplier_count)} />
                <Metric label="Status" value={selectedProduct.product.status} />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active BOM</p>
                {selectedProduct.active_bom_header ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <p>Version {selectedProduct.active_bom_header.version}</p>
                    <p>Status: {selectedProduct.active_bom_header.status}</p>
                    <p>
                      Effective: {selectedProduct.active_bom_header.effective_from ?? "Immediate"}
                      {selectedProduct.active_bom_header.effective_to ? ` to ${selectedProduct.active_bom_header.effective_to}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No active BOM is published for this product.</p>
                )}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {selectedProduct.product.description || "No product description has been added yet."}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-400">
              Select a product row to inspect BOM coverage, approved supplier count, and current master data attributes.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
