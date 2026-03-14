"use client";

import { useMemo, useState } from "react";

import { BomTreeViewer } from "@/components/master-data/bom-tree-viewer";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
};

type BomHeader = {
  id: string;
  product_id: string;
  version: string;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
};

type ExplosionRow = {
  level: number;
  parent_product_id: string;
  component_product_id: string;
  component_sku: string;
  component_name: string;
  required_qty: number;
  uom: string;
};

export function BomCatalog({ products, headers, explosionsByProduct }: { products: ProductOption[]; headers: BomHeader[]; explosionsByProduct: Record<string, ExplosionRow[]> }) {
  const initialProductId = headers[0]?.product_id ?? products[0]?.id ?? "";
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);

  const productHeaders = useMemo(() => headers.filter((header) => header.product_id === selectedProductId), [headers, selectedProductId]);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const explosion = explosionsByProduct[selectedProductId] ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Master Data</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Bill of Materials</h1>
            <p className="mt-2 text-sm text-slate-500">Review active BOM structures grouped by product and inspect recursive component requirements.</p>
          </div>
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none">
            {products.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Published Versions</h2>
          <div className="mt-4 space-y-3">
            {productHeaders.length > 0 ? productHeaders.map((header) => (
              <div key={header.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Version {header.version}</p>
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">{header.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-500">Effective {header.effective_from ?? "immediately"}{header.effective_to ? ` to ${header.effective_to}` : ""}</p>
              </div>
            )) : <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No BOM headers exist for {selectedProduct?.name ?? "this product"}.</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Explosion Tree</h2>
            <p className="mt-1 text-sm text-slate-500">Component quantities are expanded from the selected finished good downward.</p>
          </div>
          <BomTreeViewer rows={explosion} />
        </div>
      </section>
    </div>
  );
}
