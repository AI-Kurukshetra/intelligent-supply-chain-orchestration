"use client";

import { useState, useTransition } from "react";

import { revokeApiKey } from "@/app/(app)/settings/api-keys/actions";

type ApiKeyListItem = {
  id: string;
  user_id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function ApiKeysTable({ keys }: { keys: ApiKeyListItem[] }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">API keys</h2>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">{key.name}</p>
              <p className="text-sm text-slate-500">Prefix: {key.key_prefix} • Scopes: {key.scopes.join(", ") || "none"}</p>
            </div>
            <button
              type="button"
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600"
              disabled={isPending || Boolean(key.revoked_at)}
              onClick={() => {
                startTransition(async () => {
                  await revokeApiKey(key.id);
                  setMessage(`Revoked ${key.name}.`);
                });
              }}
            >
              {key.revoked_at ? "Revoked" : "Revoke"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}