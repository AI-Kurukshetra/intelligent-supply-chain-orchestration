"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { hasPermission, type Role } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] | null;

export function useAuth() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) {
        return;
      }

      setUser(data.user ?? null);

      if (data.user) {
        const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        if (mounted) {
          setProfile(profileRow ?? null);
        }
      } else {
        setProfile(null);
      }
    };

    void syncUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const role = (profile?.role ?? user?.user_metadata?.role ?? null) as Role | null;
  const tenantId = profile?.tenant_id ?? (typeof user?.user_metadata?.tenant_id === "string" ? user.user_metadata.tenant_id : null);

  return {
    user,
    profile,
    tenantId,
    role,
    hasPermission: (resource: string, action: string) => (role ? hasPermission(role, resource, action) : false),
    signOut: () => supabase.auth.signOut()
  };
}