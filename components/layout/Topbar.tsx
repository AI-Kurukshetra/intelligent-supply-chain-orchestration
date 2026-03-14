"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Executive Dashboard",
  "/demand": "Demand Workbench",
  "/supply": "Supply Planning",
  "/inventory": "Inventory Positions",
  "/planning": "Concurrent Planning",
  "/exceptions": "Exception Queue",
  "/collaboration/suppliers": "Supplier Collaboration",
  "/analytics": "Analytics",
  "/integrations": "Integrations"
};

function resolveTitle(pathname: string) {
  const exact = titles[pathname];
  if (exact) return exact;
  const match = Object.entries(titles).find(([path]) => pathname.startsWith(`${path}/`));
  return match?.[1] ?? "ISCOP Workspace";
}

export function Topbar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      <button type="button" className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition hover:border-supply-300 hover:text-slate-700 md:flex">
        <Search className="h-4 w-4" />
        <span>Ask AI</span>
        <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-400">Cmd+K</span>
      </button>
      <div className="flex items-center gap-3">
        <button type="button" className="relative rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        </button>
        <button type="button" className="flex items-center gap-2 rounded-full border border-slate-200 px-2.5 py-1.5 transition hover:bg-slate-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 font-mono text-xs font-semibold text-white">OP</div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-slate-900">Ops Planner</p>
            <p className="text-xs text-slate-500">Enterprise</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
