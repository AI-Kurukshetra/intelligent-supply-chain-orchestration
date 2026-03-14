import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { SparklineChart } from "@/components/charts/SparklineChart";

export function KpiTile({ label, value, series, uom, delta, targetDelta }: { label: string; value: string | number; series: number[]; uom?: string | null; delta?: number | null; targetDelta?: number | null }) {
  const positive = (targetDelta ?? 0) >= 0;
  const trendIcon = (delta ?? 0) > 0 ? <ArrowUpRight className="h-4 w-4" /> : (delta ?? 0) < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="font-mono text-3xl font-semibold text-slate-900">{value}</p>
            {uom ? <span className="pb-1 text-xs uppercase tracking-[0.2em] text-slate-400">{uom}</span> : null}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{trendIcon}{(delta ?? 0).toFixed(1)}%</span>
      </div>
      <div className="mt-3"><SparklineChart data={series} /></div>
      <p className="mt-3 text-xs text-slate-500">Vs target: <span className={positive ? "text-emerald-700" : "text-rose-700"}>{(targetDelta ?? 0).toFixed(1)}%</span></p>
    </div>
  );
}
