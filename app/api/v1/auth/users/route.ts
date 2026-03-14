import { render } from "@react-email/components";

import { createInvitedProfile, getUserContext } from "@/lib/auth/server";
import { requirePermission } from "@/lib/auth/permissions";
import { resend } from "@/lib/email/client";
import { InvitationEmail } from "@/lib/email/templates/InvitationEmail";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "users", "read");

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;

  return Response.json({
    data: sliced,
    next_cursor: hasMore ? sliced.at(-1)?.created_at ?? null : null,
    has_more: hasMore
  });
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const context = await getUserContext(user.id);
  requirePermission(context.role, "users", "write");

  const body = (await request.json()) as {
    email: string;
    role: "super_admin" | "planner" | "sop_manager" | "procurement" | "viewer" | "integration_admin" | "supplier";
  };

  const serviceClient = await createSupabaseServiceClient();
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/api/auth/callback?next=/dashboard`;

  const invitation = await serviceClient.auth.admin.inviteUserByEmail(body.email, {
    data: {
      role: body.role,
      tenant_id: context.tenantId
    },
    redirectTo
  });

  if (invitation.error || !invitation.data.user) {
    throw new Error(invitation.error?.message ?? "Failed to invite user.");
  }

  const generatedLink = await serviceClient.auth.admin.generateLink({
    type: "invite",
    email: body.email,
    options: {
      redirectTo
    }
  });

  if (generatedLink.error) {
    throw new Error(generatedLink.error.message);
  }

  const profile = await createInvitedProfile({
    id: invitation.data.user.id,
    tenant_id: context.tenantId,
    email: body.email,
    role: body.role
  });

  const inviteLink = generatedLink.data.properties?.action_link ?? `${origin}/login`;
  const html = await render(
    InvitationEmail({
      organizationName: context.organization.name,
      inviteLink,
      role: body.role
    })
  );

  await resend.emails.send({
    from: "ISCOP <no-reply@iscop.ai>",
    to: body.email,
    subject: `You have been invited to ${context.organization.name}`,
    html
  });

  return Response.json(profile, { status: 201 });
});