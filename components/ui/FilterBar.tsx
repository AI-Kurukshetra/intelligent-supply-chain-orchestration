import { Search } from "lucide-react";

export function FilterBar({ search, onSearchChange, filters, chips }: { search: string; onSearchChange: (value: string) => void; filters?: React.ReactNode; chips?: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-supply-300 focus:bg-white" />
        </div>
        {filters}
      </div>
      {chips?.length ? <div className="mt-3 flex flex-wrap gap-2">{chips.map((chip) => <span key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{chip}</span>)}</div> : null}
    </div>
  );
}
