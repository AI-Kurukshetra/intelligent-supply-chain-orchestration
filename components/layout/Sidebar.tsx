"use client";

import {
  AlertTriangle,
  BarChart3,
  Cable,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  Factory,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Package2,
  Settings,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAppStore } from "@/stores/appStore";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const groups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Planning",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/demand", label: "Demand", icon: BarChart3 },
      { href: "/supply", label: "Supply", icon: ClipboardList },
      { href: "/inventory", label: "Inventory", icon: Package2 },
      { href: "/planning", label: "Planning", icon: Factory },
      { href: "/planning/scenarios", label: "Scenarios", icon: GitBranch }
    ]
  },
  {
    title: "Operations",
    items: [
      { href: "/exceptions", label: "Exceptions", icon: AlertTriangle, badge: 8 },
      { href: "/collaboration/suppliers", label: "Collaboration", icon: Users },
      { href: "/analytics", label: "Analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Configuration",
    items: [
      { href: "/master-data/products", label: "Master Data", icon: Database },
      { href: "/integrations", label: "Integrations", icon: Cable },
      { href: "/settings/users", label: "Settings", icon: Settings }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((state: { sidebarCollapsed: boolean }) => state.sidebarCollapsed);
  const setCollapsed = useAppStore((state: { setSidebarCollapsed: (value: boolean) => void }) => state.setSidebarCollapsed);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed(!collapsed);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [collapsed, setCollapsed]);

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-navy-800 bg-navy-900 text-white transition-[width] duration-200 ${collapsed ? "w-[88px]" : "w-[240px]"}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className={`overflow-hidden transition-opacity ${collapsed ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="30" height="30" rx="8" fill="#0EA5E9" />
              <path d="M10 11H24V14H10V11ZM10 16H20V19H10V16ZM10 21H24V24H10V21Z" fill="white" />
            </svg>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-navy-200">ISCOP</p>
              <p className="text-sm font-semibold">Industrial Precision</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className={`px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-navy-300 ${collapsed ? "hidden" : "block"}`}>{group.title}</p>
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-2xl border-l-2 px-3 py-2.5 transition ${active ? "border-supply-500 bg-white/10 text-white" : "border-transparent text-navy-100 hover:bg-white/5"}`}>
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className={`min-w-0 flex-1 text-sm ${collapsed ? "hidden" : "block"}`}>{item.label}</span>
                    {item.badge ? <span className={`rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white ${collapsed ? "hidden" : "inline-flex"}`}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-supply-500 font-mono text-sm font-semibold text-white">OP</div>
          <div className={`${collapsed ? "hidden" : "block"} min-w-0 flex-1`}>
            <p className="truncate text-sm font-semibold">Operations Planner</p>
            <p className="truncate text-xs text-navy-200">planner@iscop.ai</p>
          </div>
          {!collapsed ? <LogOut className="h-4 w-4 text-navy-200" /> : null}
        </div>
      </div>
    </aside>
  );
}
