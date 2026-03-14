const severityClasses = {
  critical: "bg-danger text-white",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-200 text-slate-700"
} as const;

export function SeverityBadge({ severity }: { severity: keyof typeof severityClasses }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${severityClasses[severity]}`}>{severity}</span>;
}
