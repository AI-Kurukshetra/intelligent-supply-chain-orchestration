"use client";

import { useState, useTransition } from "react";

import { deactivateUser, updateUserRole } from "@/app/(app)/settings/users/actions";
import type { Role } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/types";

type UserRow = Database["public"]["Tables"]["profiles"]["Row"];

type UsersTableProps = {
  users: UserRow[];
};

const roles: UserRow["role"][] = [
  "super_admin",
  "planner",
  "sop_manager",
  "procurement",
  "viewer",
  "integration_admin",
  "supplier"
];

export function UsersTable({ users }: UsersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Tenant users</h2>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 align-top">
                <td className="py-4 pr-4">{user.email}</td>
                <td className="py-4 pr-4">
                  <select
                    defaultValue={user.role}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    onChange={(event) => {
                      startTransition(async () => {
                        await updateUserRole(user.id, event.target.value as Role);
                        setMessage(`Updated role for ${user.email}.`);
                      });
                    }}
                    disabled={isPending}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-4 pr-4">{user.status}</td>
                <td className="py-4">
                  <button
                    type="button"
                    className="rounded-xl bg-red-50 px-4 py-2 font-medium text-red-600"
                    onClick={() => {
                      startTransition(async () => {
                        await deactivateUser(user.id);
                        setMessage(`Deactivated ${user.email}.`);
                      });
                    }}
                    disabled={isPending || user.status === "inactive"}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
