import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/types";

type SessionUpdateResult = {
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient<Database>>;
  user: User | null;
};

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const getAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function updateSession(
  request: NextRequest,
  existingResponse?: NextResponse
): Promise<SessionUpdateResult> {
  let response = existingResponse ?? NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = existingResponse ?? NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  response.headers.set("x-supabase-auth-state", user ? "authenticated" : "missing");

  return { response, supabase, user };
}
