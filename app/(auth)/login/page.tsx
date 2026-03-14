"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string>(searchParams.get("error") ?? "");
  const { register, handleSubmit } = useForm<LoginFormValues>();

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
  });

  const sendMagicLink = async () => {
    const email = window.prompt("Enter your email for a magic link");
    if (!email) {
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`
      }
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setError("Magic link sent. Check your inbox.");
  };

  const signInWithSso = async () => {
    const tenantSlug = window.prompt("Enter your tenant slug for SSO");
    if (!tenantSlug) {
      return;
    }

    const { error: ssoError } = await supabase.auth.signInWithSSO({
      domain: `${tenantSlug}.example.com`,
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (ssoError) {
      setError(ssoError.message);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <section className="w-full rounded-3xl bg-white p-10 shadow-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-muted">Authentication</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Log in to ISCOP</h1>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2 text-sm text-slate-600">
            Email
            <input {...register("email", { required: true })} type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block space-y-2 text-sm text-slate-600">
            Password
            <input {...register("password", { required: true })} type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2 font-medium text-white">Log in</button>
            <button type="button" onClick={sendMagicLink} className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700">
              Send magic link
            </button>
            <button type="button" onClick={signInWithSso} className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700">
              Continue with SSO
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}