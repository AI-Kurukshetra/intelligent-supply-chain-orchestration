"use client";

import type { ReactNode } from "react";

import { AiQueryPanel } from "@/components/ai/AiQueryPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/stores/appStore";

function ShellInner({ children }: Readonly<{ children: ReactNode }>) {
  const collapsed = useAppStore((state: { sidebarCollapsed: boolean }) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-900">
      <Sidebar />
      <div className={`transition-[padding-left] duration-200 ${collapsed ? "pl-[88px]" : "pl-[240px]"}`}>
        <Topbar />
        <main className="min-h-[calc(100vh-56px)] px-6 py-6">{children}</main>
      </div>
      <AiQueryPanel />
    </div>
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return <ShellInner>{children}</ShellInner>;
}
