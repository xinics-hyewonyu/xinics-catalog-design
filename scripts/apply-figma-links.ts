/**
 * Apply figma-apply-plan.json to catalogs table.
 * Sets design_tool='피그마' + file_path=<figma_url> for each plan entry.
 * Also writes an edit_logs row matching update-catalog.ts format.
 *
 * Usage:
 *   pnpm dlx tsx scripts/apply-figma-links.ts                  # dry-run, no writes
 *   pnpm dlx tsx scripts/apply-figma-links.ts --idx=85         # apply only figma_idx=85
 *   pnpm dlx tsx scripts/apply-figma-links.ts --all            # apply all plan entries
 *
 * Safety:
 *   - Never overwrites an existing non-null file_path (re-reads current state before UPDATE)
 *   - Stops on first error
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
  catalog_id: string;
  customer: string;
  site: string;
  figma_filename: string;
  figma_url: string;
  figma_idx: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let mode: "dry" | "all" | "idx" = "dry";
  let idx: number | null = null;
  for (const a of args) {
    if (a === "--all") mode = "all";
    else if (a.startsWith("--idx=")) {
      mode = "idx";
      idx = Number(a.split("=")[1]);
    }
  }
  return { mode, idx };
}

async function main() {
  const { mode, idx } = parseArgs();
  const plan: PlanEntry[] = JSON.parse(
    fs.readFileSync(path.resolve("scripts/figma-apply-plan.json"), "utf-8"),
  );

  let targets: PlanEntry[];
  if (mode === "idx") {
    targets = plan.filter((p) => p.figma_idx === idx);
    if (targets.length === 0) {
      console.error(`figma_idx=${idx}에 해당하는 plan entry 없음`);
      process.exit(1);
    }
  } else {
    targets = plan;
  }

  console.log(`대상 ${targets.length}건 (mode=${mode})`);
  console.log("");

  for (const p of targets) {
    console.log(`[${p.figma_idx}] ${p.customer} / ${p.site}`);
    console.log(`  ← ${p.figma_filename}`);
    console.log(`  URL: ${p.figma_url}`);

    // Re-read current state (safety)
    const { data: current, error: readErr } = await supabase
      .from("catalogs")
      .select("id, site_name, customer_name, design_tool, file_path, deleted_at")
      .eq("id", p.catalog_id)
      .single();
    if (readErr || !current) {
      console.error(`  ✗ catalog row read failed: ${readErr?.message}`);
      process.exit(1);
    }
    if (current.deleted_at) {
      console.error(`  ✗ 휴지통에 있는 row — skip`);
      continue;
    }
    if (current.file_path) {
      console.error(
        `  ✗ 기존 file_path 있음 ("${current.file_path}") — 덮어쓰지 않음`,
      );
      continue;
    }
    if (
      current.site_name !== p.site ||
      current.customer_name !== p.customer
    ) {
      console.error(
        `  ✗ DB 상태가 plan과 다름: ${current.customer_name}/${current.site_name}`,
      );
      continue;
    }

    if (mode === "dry") {
      console.log(`  · dry-run: design_tool=피그마, file_path=${p.figma_url}`);
      console.log("");
      continue;
    }

    // Build diff (matches update-catalog.ts format)
    const before = {
      design_tool: current.design_tool ?? null,
      file_path: current.file_path ?? null,
    };
    const after = {
      design_tool: "피그마",
      file_path: p.figma_url,
    };
    const diff: Record<string, { before: unknown; after: unknown }> = {};
    for (const f of ["design_tool", "file_path"] as const) {
      if (before[f] !== after[f]) diff[f] = { before: before[f], after: after[f] };
    }

    const { error: updErr } = await supabase
      .from("catalogs")
      .update(after)
      .eq("id", p.catalog_id);
    if (updErr) {
      console.error(`  ✗ UPDATE 실패: ${updErr.message}`);
      process.exit(1);
    }

    // Write edit log (best-effort)
    const { error: logErr } = await supabase.from("catalog_edit_logs").insert({
      catalog_id: p.catalog_id,
      action: "updated",
      changes: diff,
    });
    if (logErr) {
      console.warn(`  ⚠ edit_logs 기록 실패 (catalog는 이미 업데이트됨): ${logErr.message}`);
    }

    console.log(`  ✓ UPDATE 완료`);
    console.log("");
  }

  if (mode === "dry") {
    console.log("(dry-run 모드 — 실제 변경 없음. --idx=N 또는 --all 옵션으로 실행)");
  } else {
    console.log("완료");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
