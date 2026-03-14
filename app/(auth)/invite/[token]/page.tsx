"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createClient } from "@/lib/supabase/client";

type InvitePageProps = {
  params: { token: string };
};

type AcceptInviteForm = {
  password: string;
};

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm<AcceptInviteForm>();
  const supabase = createClient();

  const onSubmit = handleSubmit(async (values) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: params.token,
      type: "invite"
    });

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <section className="w-full rounded-3xl bg-white p-10 shadow-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-muted">Invitation</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Accept your invitation</h1>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2 text-sm text-slate-600">
            Set password
            <input {...register("password", { required: true })} type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2 font-medium text-white">Accept invitation</button>
        </form>
      </section>
    </main>
  );
}