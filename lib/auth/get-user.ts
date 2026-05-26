import { createClient } from "@/lib/supabase/server";

/**
 * Returns the currently signed-in user (or null) for server components, route
 * handlers, and server actions. Uses `auth.getUser()` which re-validates the
 * JWT against Supabase, so the value can be trusted for authorization checks.
 */
export async function getUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
