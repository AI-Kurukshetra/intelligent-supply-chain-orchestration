import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { ProblemDetail } from "@/lib/utils/errors";
import type { Role } from "@/lib/auth/permissions";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
export type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];

export async function getCurrentProfile(userId: string): Promise<ProfileRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", "Profile not found for authenticated user.");
  }

  return data;
}

export async function getTenantOrganization(tenantId: string): Promise<OrganizationRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("organizations").select("*").eq("id", tenantId).single();

  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", "Organization not found.");
  }

  return data;
}

export async function getUserContext(userId: string) {
  const profile = await getCurrentProfile(userId);
  const organization = await getTenantOrganization(profile.tenant_id);

  return {
    profile,
    organization,
    tenantId: profile.tenant_id,
    role: profile.role as Role
  };
}

export async function getTenantUserById(tenantId: string, userId: string): Promise<ProfileRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new ProblemDetail(404, "Not Found", "User not found in current tenant.");
  }

  return data;
}

export async function revokeUserSessions(userId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ProblemDetail(500, "Configuration Error", "Supabase admin credentials are missing.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/logout`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok && response.status !== 404) {
    throw new ProblemDetail(502, "Bad Gateway", "Failed to revoke Supabase auth sessions.");
  }
}

export async function createInvitedProfile(input: {
  id: string;
  tenant_id: string;
  email: string;
  role: Role;
}) {
  const serviceClient = await createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("profiles")
    .insert({
      id: input.id,
      tenant_id: input.tenant_id,
      email: input.email,
      role: input.role,
      status: "invited",
      preferences: {}
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Database Error", "Failed to create invited profile.");
  }

  return data;
}