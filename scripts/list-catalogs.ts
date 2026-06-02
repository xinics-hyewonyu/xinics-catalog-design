/**
 * Read-only: list all catalogs (site_name, customer_name, current design_tool/file_path).
 *
 * Usage:
 *   pnpm dlx tsx scripts/list-catalogs.ts
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
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const { data, error } = await supabase
    .from("catalogs")
    .select(
      "id, site_name, customer_name, design_tool, file_path, catalog_url, deleted_at, created_at",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("query failed:", error);
    process.exit(1);
  }
  if (!data) {
    console.log("(no rows)");
    return;
  }

  const live = data.filter((r) => !r.deleted_at);
  const trashed = data.filter((r) => r.deleted_at);

  console.log(`총 ${data.length}개 (활성 ${live.length} / 휴지통 ${trashed.length})`);
  console.log("");
  console.log("idx\tcustomer_name\tsite_name\tdesign_tool\tfile_path(축약)");
  console.log("---\t-------------\t---------\t-----------\t--------------");
  live.forEach((r, i) => {
    const fp = r.file_path ? String(r.file_path).slice(0, 50) : "";
    console.log(
      `${i + 1}\t${r.customer_name}\t${r.site_name}\t${r.design_tool ?? ""}\t${fp}`,
    );
  });

  if (trashed.length > 0) {
    console.log("");
    console.log(`(휴지통 ${trashed.length}개는 생략)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
