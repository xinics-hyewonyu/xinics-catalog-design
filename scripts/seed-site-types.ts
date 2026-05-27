/**
 * Seed extra catalog_site_types (CMS, 예약관리시스템). One-shot.
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
    { slug: "cms", name: "CMS", sort_order: 3, is_active: true },
    {
      slug: "reservation",
      name: "예약관리시스템",
      sort_order: 4,
      is_active: true,
    },
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
