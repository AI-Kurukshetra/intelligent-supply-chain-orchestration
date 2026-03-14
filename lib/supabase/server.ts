import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/types";

type CookieToSet = {
  name: string;
  value: string;
  options?: Awaited<ReturnType<typeof cookies>> extends infer Store
    ? Store extends { set: (...args: infer Args) => unknown }
      ? Args[2]
      : never
    : never;
};

const getSupabaseUrl = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return value;
};

const getAnonKey = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return value;
};

const getServiceRoleKey = () => {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return value;
};

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

export async function createSupabaseServiceClient(): Promise<SupabaseClient<Database>> {
  return createServerClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        return;
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
