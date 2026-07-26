"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Role = "owner" | "staff";

/**
 * Fetches the signed-in user's role from `profiles`.
 * Defaults to "staff" (the least-privileged role) while loading or if
 * anything goes wrong, so the UI never briefly shows owner-only controls
 * to someone who isn't one.
 */
export function useRole() {
  const [role, setRole] = useState<Role>("staff");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (active) {
        setRole((data?.role as Role) ?? "staff");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { role, isOwner: role === "owner", loading };
}
