import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "magiclink";
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }

    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "invite" | "recovery" | "email_change"
    });

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }

    return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as {
    token_hash?: string;
    type?: "magiclink" | "invite" | "recovery" | "email_change";
  };

  if (!body.token_hash || !body.type) {
    return NextResponse.json({ error: "token_hash and type are required" }, { status: 400 });
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: body.token_hash,
    type: body.type
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}