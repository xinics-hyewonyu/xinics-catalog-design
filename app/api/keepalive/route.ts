import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// Never cache — every hit must reach the database so Supabase counts it as
// activity and doesn't auto-pause the free-tier project (~7 days idle → pause).
export const dynamic = "force-dynamic";

/**
 * Keepalive endpoint hit once a day by Vercel Cron (see vercel.json). It runs a
 * trivial DB query so Supabase registers activity and never pauses the project.
 *
 * Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <secret>`
 * automatically when the env var is set, so random visitors can't trigger it.
 * If CRON_SECRET is unset (e.g. local dev), the check is skipped.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("catalogs")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
