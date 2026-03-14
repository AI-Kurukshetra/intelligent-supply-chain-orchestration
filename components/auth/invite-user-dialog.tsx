"use client";

import { useFormStatus } from "react-dom";

import { inviteUser } from "@/app/(app)/settings/users/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-xl bg-sky-500 px-4 py-2 font-medium text-white"
      disabled={pending}
    >
      {pending ? "Inviting..." : "Invite user"}
    </button>
  );
}

export function InviteUserDialog() {
  return (
    <form action={inviteUser} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Invite user</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-600">
          Email
          <input name="email" type="email" required className="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-600">
          Role
          <select name="role" className="w-full rounded-xl border border-slate-300 px-3 py-2" defaultValue="viewer">
            <option value="planner">planner</option>
            <option value="sop_manager">sop_manager</option>
            <option value="procurement">procurement</option>
            <option value="viewer">viewer</option>
            <option value="integration_admin">integration_admin</option>
            <option value="supplier">supplier</option>
            <option value="super_admin">super_admin</option>
          </select>
        </label>
      </div>
      <SubmitButton />
    </form>
  );
}