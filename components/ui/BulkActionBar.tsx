"use client";

export function BulkActionBar({ count, actions }: { count: number; actions: React.ReactNode }) {
  if (count <= 0) return null;
  return <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-xl"><p className="text-sm font-medium text-slate-700">{count} selected</p><div className="h-5 w-px bg-slate-200" /><div className="flex items-center gap-2">{actions}</div></div>;
}
