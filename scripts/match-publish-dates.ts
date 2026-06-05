/**
 * Dry-run: match scripts/lms-publish-dates.json entries to DB catalog rows
 * by URL host. For each (host) the matched row(s) become candidates for
 * created_at = `${YYYY-MM}-01T00:00:00+09:00`.
 *
 * Writes:
 *  - scripts/publish-dates-plan.json (changes to apply)
 *  - scripts/publish-dates-skipped.json (unmatched/skip reasons)
 *
 * NO writes to DB.
 *
 * Usage:
 *   pnpm dlx tsx scripts/match-publish-dates.ts
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

type InputRow = {
  name: string;
  build_yyyymm: string | null;
  catalog_url: string | null;
};

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function main() {
  const inputs: InputRow[] = JSON.parse(
    fs.readFileSync(path.resolve("scripts/lms-publish-dates.json"), "utf-8"),
  );

  const { data: rows, error } = await supabase
    .from("catalogs")
    .select("id, customer_name, site_name, catalog_url, created_at, deleted_at")
    .is("deleted_at", null);
  if (error || !rows) {
    console.error("query failed:", error);
    process.exit(1);
  }

  // host → DB rows
  const dbByHost = new Map<string, typeof rows>();
  for (const r of rows) {
    const h = hostOf(r.catalog_url);
    if (!h) continue;
    if (!dbByHost.has(h)) dbByHost.set(h, []);
    dbByHost.get(h)!.push(r);
  }

  type PlanEntry = {
    input_name: string;
    catalog_id: string;
    customer_name: string;
    site_name: string;
    host: string;
    current_created_at: string;
    next_created_at: string;
  };
  type SkipEntry = {
    input_name: string;
    catalog_url: string | null;
    build_yyyymm: string | null;
    reason: string;
  };

  const plan: PlanEntry[] = [];
  const skipped: SkipEntry[] = [];

  for (const inp of inputs) {
    if (!inp.build_yyyymm) {
      skipped.push({
        input_name: inp.name,
        catalog_url: inp.catalog_url,
        build_yyyymm: inp.build_yyyymm,
        reason: "구축년월 비어있음",
      });
      continue;
    }
    const host = hostOf(inp.catalog_url);
    if (!host) {
      skipped.push({
        input_name: inp.name,
        catalog_url: inp.catalog_url,
        build_yyyymm: inp.build_yyyymm,
        reason: "catalog_url 없음/파싱 실패",
      });
      continue;
    }
    const matches = dbByHost.get(host);
    if (!matches || matches.length === 0) {
      skipped.push({
        input_name: inp.name,
        catalog_url: inp.catalog_url,
        build_yyyymm: inp.build_yyyymm,
        reason: `DB에 호스트(${host}) 일치 row 없음`,
      });
      continue;
    }
    if (!/^\d{4}-\d{2}$/.test(inp.build_yyyymm)) {
      skipped.push({
        input_name: inp.name,
        catalog_url: inp.catalog_url,
        build_yyyymm: inp.build_yyyymm,
        reason: `build_yyyymm 형식 오류`,
      });
      continue;
    }
    const next = `${inp.build_yyyymm}-01T00:00:00+09:00`;
    for (const m of matches) {
      plan.push({
        input_name: inp.name,
        catalog_id: m.id,
        customer_name: m.customer_name,
        site_name: m.site_name,
        host,
        current_created_at: m.created_at,
        next_created_at: next,
      });
    }
  }

  fs.writeFileSync(
    path.resolve("scripts/publish-dates-plan.json"),
    JSON.stringify(plan, null, 2),
  );
  fs.writeFileSync(
    path.resolve("scripts/publish-dates-skipped.json"),
    JSON.stringify(skipped, null, 2),
  );

  console.log(`입력 총 ${inputs.length}건`);
  console.log(`변경 대상(plan): ${plan.length}건`);
  console.log(`skip: ${skipped.length}건`);
  console.log("");
  console.log("=== 변경 대상 (host → DB row → next created_at) ===");
  for (const p of plan) {
    const cur = p.current_created_at.slice(0, 10);
    const nxt = p.next_created_at.slice(0, 10);
    const flag = cur === nxt ? " (이미 일치)" : "";
    console.log(
      `  ${p.input_name} / ${p.host}\n      [${p.customer_name} / ${p.site_name}]\n      ${cur} → ${nxt}${flag}`,
    );
  }
  console.log("");
  console.log("=== Skip ===");
  for (const s of skipped) {
    console.log(`  ${s.input_name} (${s.catalog_url ?? "-"}) — ${s.reason}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
