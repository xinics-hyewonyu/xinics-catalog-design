/**
 * Apply scripts/publish-dates-plan.json to catalogs.created_at.
 * Writes a catalog_edit_logs row for each change.
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-publish-dates.ts          # dry-run, no writes
 *   pnpm dlx tsx scripts/apply-publish-dates.ts --apply  # apply all
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

type PlanEntry = {
  input_name: string;
  catalog_id: string;
  customer_name: string;
  site_name: string;
  host: string;
  current_created_at: string;
  next_created_at: string;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const plan: PlanEntry[] = JSON.parse(
    fs.readFileSync(path.resolve("scripts/publish-dates-plan.json"), "utf-8"),
  );

  console.log(`${apply ? "APPLY" : "DRY-RUN"} 모드: ${plan.length}건`);
  console.log("");

  let okCount = 0;
  let unchangedCount = 0;
  let errCount = 0;

  for (const p of plan) {
    if (p.current_created_at === p.next_created_at) {
      unchangedCount++;
      continue;
    }

    if (!apply) {
      okCount++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("catalogs")
      .update({ created_at: p.next_created_at })
      .eq("id", p.catalog_id);
    if (updErr) {
      console.error(
        `  ✗ ${p.customer_name}/${p.site_name}: UPDATE 실패 — ${updErr.message}`,
      );
      errCount++;
      continue;
    }

    const diff = {
      created_at: {
        before: p.current_created_at,
        after: p.next_created_at,
      },
      source: "bulk-set-publish-dates",
    };
    const { error: logErr } = await supabase.from("catalog_edit_logs").insert({
      catalog_id: p.catalog_id,
      action: "updated",
      changes: diff,
    });
    if (logErr) {
      console.warn(
        `  ⚠ edit_log 기록 실패 (catalog는 이미 업데이트됨): ${p.customer_name}/${p.site_name} — ${logErr.message}`,
      );
    }
    okCount++;
  }

  console.log("");
  console.log(`완료: ${okCount}건${apply ? " UPDATE" : " (dry-run)"}, 이미 일치: ${unchangedCount}건, 실패: ${errCount}건`);
  if (!apply) {
    console.log("");
    console.log("실제 적용하려면 --apply 옵션 추가");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
