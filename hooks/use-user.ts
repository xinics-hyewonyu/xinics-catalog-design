"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase auth state in client components.
 *
 * Accepts an `initialUser` from a server component (so the first render has the
 * authoritative server value and we avoid a flicker) and then subscribes to
 * `onAuthStateChange` for sign-in/out events.
 */
export function useUser(initialUser: User | null = null) {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }
    const supabase = createClient();

    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return user;
}
