"use server";

import { headers } from "next/headers";

async function getBaseUrl() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function createApiKey(name: string, scopes: string[]) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, scopes })
  });

  if (!response.ok) {
    throw new Error("Failed to create API key.");
  }

  return response.json();
}

export async function revokeApiKey(id: string) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/auth/api-keys/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to revoke API key.");
  }

  return response.json();
}