"use client";

import { useState, useTransition } from "react";

import { createApiKey } from "@/app/(app)/settings/api-keys/actions";

export function CreateApiKeyDialog() {
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Create API key</h2>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const name = String(formData.get("name") ?? "");
          const scopes = String(formData.get("scopes") ?? "")
            .split(",")
            .map((scope) => scope.trim())
            .filter(Boolean);

          startTransition(async () => {
            const result = await createApiKey(name, scopes);
            setGeneratedKey(result.api_key as string);
          });
        }}
      >
        <label className="block space-y-2 text-sm text-slate-600">
          Name
          <input name="name" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block space-y-2 text-sm text-slate-600">
          Scopes
          <input name="scopes" placeholder="demand:read,supply:write" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded-xl bg-sky-500 px-4 py-2 font-medium text-white" disabled={isPending}>
          {isPending ? "Creating..." : "Create key"}
        </button>
      </form>
      {generatedKey ? (
        <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white">
          <p className="mb-2 font-semibold">Copy this key now. It will only be shown once.</p>
          <code className="break-all">{generatedKey}</code>
        </div>
      ) : null}
    </div>
  );
}