const palette: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  approved: "bg-emerald-100 text-emerald-700",
  submitted: "bg-supply-100 text-supply-700",
  review: "bg-supply-100 text-supply-700",
  running: "bg-supply-100 text-supply-700",
  open: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  draft: "bg-slate-200 text-slate-700",
  inactive: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-700",
  failed: "bg-rose-100 text-rose-700",
  blocked: "bg-rose-100 text-rose-700",
  critical: "bg-danger text-white"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${palette[status] ?? "bg-slate-200 text-slate-700"}`}>{status.replaceAll("_", " ")}</span>;
}
