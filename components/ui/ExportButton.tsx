"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";

export function ExportButton({ label = "Export", onExport }: { label?: string; onExport: () => Promise<{ blob: Blob; filename: string }> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await onExport(); const url = URL.createObjectURL(result.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.filename; anchor.click(); URL.revokeObjectURL(url); })} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
      <Download className="h-4 w-4" />
      {pending ? "Exporting..." : label}
    </button>
  );
}
