import fs from "node:fs/promises";
import path from "node:path";

import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const authDir = path.resolve(process.cwd(), "playwright/.auth");
const storageStatePath = path.resolve(authDir, "user.json");

async function ensurePlannerUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "<anon-key>";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "<service-role-key>";
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const tenantId = "00000000-0000-4000-8000-000000000001";
  const plannerId = "00000000-0000-4000-8000-000000000002";
  const email = process.env.E2E_USER_EMAIL ?? "planner@acme-electronics.test";
  const password = process.env.E2E_USER_PASSWORD ?? "Planner#12345";

  try {
    await admin.auth.admin.createUser({
      id: plannerId,
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "planner" }
    });
  } catch {
    // Local Supabase may already contain the seeded user.
  }

  await admin.from("organizations").upsert({
    id: tenantId,
    name: "Acme Electronics Manufacturing",
    slug: "acme-electronics",
    plan: "professional",
    status: "active",
    settings: { e2e_seeded: true, sso_enabled: false }
  });

  await admin.from("profiles").upsert({
    id: plannerId,
    tenant_id: tenantId,
    email,
    first_name: "Casey",
    last_name: "Planner",
    role: "planner",
    status: "active",
    preferences: { theme: "industrial-precision" }
  });

  const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export default async function globalSetup(_config: FullConfig) {
  await fs.mkdir(authDir, { recursive: true });
  await ensurePlannerUser();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login");
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? "planner@acme-electronics.test");
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD ?? "Planner#12345");
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}
