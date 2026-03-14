"use client";

import { useMemo, useState, useTransition } from "react";

type ConnectorRow = Record<string, unknown> & {
  id: string;
  name: string;
  connector_type: string;
  status: string;
  last_sync_at?: string | null;
  latest_job?: { records_processed?: number; error_count?: number; created_at?: string; status?: string } | null;
};

type SyncJobRow = Record<string, unknown> & { id: string; object_type: string; status: string; records_processed: number; error_count: number; created_at: string };

export function IntegrationsWorkspace({ connectors, syncJobs }: { connectors: ConnectorRow[]; syncJobs: SyncJobRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("csv_upload");

  const groupedJobs = useMemo(() => syncJobs.slice(0, 20), [syncJobs]);

  const addConnector = () => {
    const name = window.prompt("Connector name");
    if (!name) return;
    startTransition(async () => {
      const config = selectedType === "generic_rest"
        ? { base_url: window.prompt("Base URL") ?? "https://example.com", auth_type: "bearer", token: "demo-token", endpoints: { products: "/products" } }
        : { delimiter: ",", sample: true };
      const response = await fetch("/api/v1/integrations/connectors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connector_type: selectedType, name, config }) });
      if (!response.ok) {
        setMessage("Unable to create connector.");
        return;
      }
      window.location.reload();
    });
  };

  const testConnector = (id: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/integrations/connectors/${id}/test`, { method: "POST" });
      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message ?? "Test completed.");
    });
  };

  const syncConnector = (id: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/v1/integrations/connectors/${id}/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ object_types: ["products", "inventory_positions"] }) });
      if (!response.ok) {
        setMessage("Unable to queue sync.");
        return;
      }
      setMessage("Sync queued.");
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
            <p className="text-sm text-slate-500">Manage CSV and REST connectors, test connections, and review sync health.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-full border border-slate-300 px-4 py-2 text-sm" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="csv_upload">CSV Upload</option>
              <option value="generic_rest">Generic REST API</option>
              <option value="sap_odata">SAP OData</option>
            </select>
            <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={addConnector}>Add Connector</button>
          </div>
        </div>
        {message ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {connectors.map((connector) => (
          <div key={connector.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{connector.connector_type.replaceAll("_", " ")}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{connector.name}</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connector.status === "active" ? "bg-emerald-100 text-emerald-700" : connector.status === "error" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>{connector.status}</span>
            </div>
            <p className="mt-4 text-sm text-slate-500">Last sync: {connector.last_sync_at ? new Date(String(connector.last_sync_at)).toLocaleString() : "Never"}</p>
            <p className="mt-2 text-sm text-slate-500">Records synced: {Number(connector.latest_job?.records_processed ?? 0).toLocaleString()}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" disabled={isPending} onClick={() => testConnector(connector.id)}>Test</button>
              <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={() => syncConnector(connector.id)}>Sync</button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Sync Job History</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Object</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Processed</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedJobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{job.object_type}</td>
                  <td className="px-4 py-3 text-slate-700">{job.status}</td>
                  <td className="px-4 py-3 text-slate-700">{Number(job.records_processed ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{Number(job.error_count ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(job.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
