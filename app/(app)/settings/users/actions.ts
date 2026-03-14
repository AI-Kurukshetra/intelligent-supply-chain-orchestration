"use server";

import { headers } from "next/headers";

import type { Role } from "@/lib/auth/permissions";

async function getBaseUrl() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function inviteUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer") as Role;
  const baseUrl = await getBaseUrl();

  const response = await fetch(`${baseUrl}/api/v1/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role })
  });

  if (!response.ok) {
    throw new Error("Failed to invite user.");
  }

  return response.json();
}

export async function updateUserRole(userId: string, role: Role) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/auth/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    throw new Error("Failed to update user role.");
  }

  return response.json();
}

export async function deactivateUser(userId: string) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/auth/users/${userId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to deactivate user.");
  }

  return response.json();
}