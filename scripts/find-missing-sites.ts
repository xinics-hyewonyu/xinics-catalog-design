/**
 * Read-only: compare CSV-listed LMS sites (scripts/lms-sites.json) against
 * the catalogs table by URL host. Reports which CSV entries are NOT yet
 * represented in the DB (any row with a matching catalog_url host counts as present).
 *
 * Usage:
 *   pnpm dlx tsx scripts/find-missing-sites.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvLocal(): Record<string, string> {
  const raw = fs.readFileSync(path.resolve(".env.local"), "utf-8");
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

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

type CsvSite = { name: string; catalog_url: string };

async function main() {
  const csv: CsvSite[] = JSON.parse(
    fs.readFileSync(path.resolve("scripts/lms-sites.json"), "utf-8"),
  );

  const { data: rows, error } = await supabase
    .from("catalogs")
    .select("id, customer_name, site_name, catalog_url, deleted_at")
    .is("deleted_at", null);
  if (error || !rows) {
    console.error("query failed:", error);
    process.exit(1);
  }

  // Build a host → DB rows map
  const dbHosts = new Map<string, typeof rows>();
  for (const r of rows) {
    const h = hostOf(r.catalog_url);
    if (!h) continue;
    if (!dbHosts.has(h)) dbHosts.set(h, []);
    dbHosts.get(h)!.push(r);
  }

  const missing: CsvSite[] = [];
  const present: Array<{ csv: CsvSite; dbRows: typeof rows }> = [];

  for (const c of csv) {
    const h = hostOf(c.catalog_url);
    if (!h) {
      console.error(`URL parse 실패: ${c.name} ${c.catalog_url}`);
      continue;
    }
    const dbMatch = dbHosts.get(h);
    if (!dbMatch) {
      missing.push(c);
    } else {
      present.push({ csv: c, dbRows: dbMatch });
    }
  }

  console.log(`CSV 총 ${csv.length}개`);
  console.log(`DB 매칭됨 (호스트 일치): ${present.length}개`);
  console.log(`DB 누락: ${missing.length}개`);
  console.log("");
  console.log("=== 누락 사이트 (도메인 기준) ===");
  for (const m of missing) {
    console.log(`  - ${m.name}\t${m.catalog_url}`);
  }

  // 또한 DB에 catalog_url이 없는(NULL) row들도 확인
  const noUrlRows = rows.filter((r) => !r.catalog_url);
  console.log("");
  console.log(`DB의 catalog_url=NULL row: ${noUrlRows.length}개`);
  for (const r of noUrlRows.slice(0, 20)) {
    console.log(`  - [${r.id.slice(0, 8)}] ${r.customer_name} / ${r.site_name}`);
  }
  if (noUrlRows.length > 20) console.log(`  ... 외 ${noUrlRows.length - 20}`);

  // Save missing list for next step
  fs.writeFileSync(
    path.resolve("scripts/missing-sites.json"),
    JSON.stringify(missing, null, 2),
  );
  console.log("");
  console.log("→ scripts/missing-sites.json 에 저장됨");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
