import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSupplierContext } from "@/lib/collaboration/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SupplierPortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getSupplierContext(user.id);

  async function signOutAction() {
    "use server";
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_48%,#ffffff_100%)]">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-700">ISCOP</p>
            <h1 className="text-lg font-semibold text-slate-900">{String(context.supplier.name)}</h1>
          </div>
          <form action={signOutAction}>
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Logout</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
