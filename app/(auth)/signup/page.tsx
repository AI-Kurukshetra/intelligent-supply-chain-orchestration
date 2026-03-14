import { redirect } from "next/navigation";

import { createOrganization } from "@/app/(auth)/signup/actions";

export default function SignupPage() {
  async function signupAction(formData: FormData) {
    "use server";

    const name = String(formData.get("organization_name") ?? "");
    const slug = String(formData.get("slug") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    await createOrganization(name, slug, email, password);
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <section className="w-full rounded-3xl bg-white p-10 shadow-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-muted">Authentication</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Create your organization</h1>
        <form action={signupAction} className="mt-8 space-y-4">
          <label className="block space-y-2 text-sm text-slate-600">
            Organization name
            <input name="organization_name" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block space-y-2 text-sm text-slate-600">
            Organization slug
            <input name="slug" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block space-y-2 text-sm text-slate-600">
            Admin email
            <input name="email" type="email" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block space-y-2 text-sm text-slate-600">
            Password
            <input name="password" type="password" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2 font-medium text-white">Create organization</button>
        </form>
      </section>
    </main>
  );
}