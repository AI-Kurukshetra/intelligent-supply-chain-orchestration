import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteHandler = (request: Request) => Promise<Response>;

export class ProblemDetail extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public type?: string
  ) {
    super(detail);
  }

  toResponse(): Response {
    return Response.json(
      {
        type: this.type ?? `https://iscop.ai/errors/${this.status}`,
        title: this.title,
        status: this.status,
        detail: this.detail
      },
      { status: this.status }
    );
  }
}

export async function requireAuth(_request: Request): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ProblemDetail(401, "Unauthorized", "A valid session is required.");
  }

  return user;
}

export async function requireTenantId(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", userId).single();

  if (error || !data?.tenant_id) {
    throw new ProblemDetail(403, "Forbidden", "The authenticated user is not associated with a tenant.");
  }

  return data.tenant_id;
}

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ProblemDetail) {
        return error.toResponse();
      }

      const detail = error instanceof Error ? error.message : "Unexpected server error.";
      return new ProblemDetail(500, "Internal Server Error", detail).toResponse();
    }
  };
}