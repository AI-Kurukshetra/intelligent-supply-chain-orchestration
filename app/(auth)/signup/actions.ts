"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProblemDetail } from "@/lib/utils/errors";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganization(name: string, slug: string, email: string, password: string) {
  const serviceClient = await createSupabaseServiceClient();
  const normalizedSlug = slugify(slug || name);

  const { data: organization, error: organizationError } = await serviceClient
    .from("organizations")
    .insert({
      name,
      slug: normalizedSlug,
      plan: "starter",
      status: "trial",
      settings: {}
    })
    .select("*")
    .single();

  if (organizationError || !organization) {
    throw new ProblemDetail(500, "Organization Creation Failed", organizationError?.message ?? "Failed to create organization.");
  }

  const userResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      tenant_id: organization.id,
      role: "super_admin"
    }
  });

  if (userResult.error || !userResult.data.user) {
    throw new ProblemDetail(500, "User Creation Failed", userResult.error?.message ?? "Failed to create admin user.");
  }

  const { error: profileError } = await serviceClient.from("profiles").insert({
    id: userResult.data.user.id,
    tenant_id: organization.id,
    email,
    role: "super_admin",
    status: "active",
    preferences: {}
  });

  if (profileError) {
    throw new ProblemDetail(500, "Profile Creation Failed", profileError.message);
  }

  return {
    organization,
    user: userResult.data.user
  };
}