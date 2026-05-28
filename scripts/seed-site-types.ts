/**
 * Seed extra catalog_site_types beyond 기본형/오픈캠퍼스형.
 * Idempotent upsert by slug — safe to re-run.
 *
 * Mirrors supabase/migrations/20260528000000_seed_more_site_types.sql so
 * existing DBs (where the script ran first) and fresh installs stay in sync.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvLocal(): Record<string, string> {
  const raw = require("node:fs").readFileSync(
    path.resolve(".env.local"),
    "utf-8",
  );
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = readEnvLocal();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const rows = [
    { slug: "sub", name: "서브형", sort_order: 3, is_active: true },
    { slug: "login", name: "로그인", sort_order: 4, is_active: true },
    { slug: "page", name: "소개페이지", sort_order: 5, is_active: true },
    { slug: "intro", name: "인트로", sort_order: 6, is_active: true },
    { slug: "oer", name: "OER", sort_order: 7, is_active: true },
    { slug: "cms", name: "CMS", sort_order: 8, is_active: true },
    { slug: "reservation", name: "예약관리시스템", sort_order: 9, is_active: true },
  ];
  const result = await supabase
    .from("catalog_site_types")
    .upsert(rows, { onConflict: "slug" })
    .select();
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  console.log("OK", result.data);
}

main();
