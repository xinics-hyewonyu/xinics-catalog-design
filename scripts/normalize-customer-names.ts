/**
 * One-off normalization: customer_name ending with '대' → '대학교'.
 * Names ending with '대학' (and anything else) are left untouched.
 *
 * Updates both bulk-upload/catalogs.csv and the Supabase `catalogs` table.
 *
 * Usage:
 *   pnpm dlx tsx scripts/normalize-customer-names.ts            # dry-run preview
 *   pnpm dlx tsx scripts/normalize-customer-names.ts --apply    # actually write
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CSV_PATH = path.resolve("bulk-upload", "catalogs.csv");

/** Match the same parser semantics used by scripts/bulk-upload.ts. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuote = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r" && next === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 2;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvEscape(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n") || cell.includes("\r")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function serializeCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

/**
 * Abbreviated names where appending '학교' would produce a non-official name.
 * Keys are the abbreviated forms; values are the official institution names.
 */
const SPECIAL_MAP: Record<string, string> = {
  부산외대: "부산외국어대학교",
  서울과기대: "서울과학기술대학교",
  수원여대: "수원여자대학교",
  숙명여대: "숙명여자대학교",
  청주교대: "청주교육대학교",
};

/**
 * Rule: ends with '대' but not '대학' → append '학교' (XXX대 → XXX대학교),
 * with a small overrides table for abbreviations whose official name isn't a
 * simple '학교' suffix (e.g. 부산외대 → 부산외국어대학교).
 */
function normalize(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed.endsWith("대")) return null;
  if (trimmed.endsWith("대학")) return null;
  if (SPECIAL_MAP[trimmed]) return SPECIAL_MAP[trimmed];
  return trimmed + "학교";
}

async function updateCsv(): Promise<Map<string, string>> {
  const raw = await fs.readFile(CSV_PATH, "utf-8");
  const rows = parseCsv(raw);
  const headers = rows[0].map((h) => h.trim());
  const customerIdx = headers.indexOf("customer_name");
  if (customerIdx < 0) throw new Error("customer_name column not found in CSV");

  const mapping = new Map<string, string>();
  let touched = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const before = row[customerIdx];
    if (before == null) continue;
    const after = normalize(before);
    if (after && after !== before) {
      mapping.set(before, after);
      row[customerIdx] = after;
      touched++;
    }
  }

  console.log(`CSV: ${touched} row(s) to update across ${mapping.size} unique name(s)`);
  for (const [from, to] of mapping) console.log(`  ${from} → ${to}`);

  if (APPLY) {
    await fs.writeFile(CSV_PATH, serializeCsv(rows), "utf-8");
    console.log(`CSV: wrote ${CSV_PATH}`);
  } else {
    console.log("CSV: dry-run (pass --apply to write)");
  }

  return mapping;
}

async function updateDb(mapping: Map<string, string>) {
  // Pull every distinct customer_name currently in the table so we can both
  // verify our mapping covers everything and warn about anything new.
  const { data, error } = await supabase
    .from("catalogs")
    .select("customer_name");
  if (error) throw new Error(`select failed: ${error.message}`);

  const distinct = new Set<string>();
  for (const row of data ?? []) {
    if (row.customer_name) distinct.add(row.customer_name);
  }

  console.log(`DB: ${distinct.size} distinct customer_name(s) in catalogs table`);

  const dbMapping = new Map<string, string>();
  for (const name of distinct) {
    const after = normalize(name);
    if (after && after !== name) dbMapping.set(name, after);
  }

  console.log(`DB: ${dbMapping.size} name(s) need updating`);
  for (const [from, to] of dbMapping) console.log(`  ${from} → ${to}`);

  if (!APPLY) {
    console.log("DB: dry-run (pass --apply to write)");
    return;
  }

  for (const [from, to] of dbMapping) {
    const upd = await supabase
      .from("catalogs")
      .update({ customer_name: to })
      .eq("customer_name", from)
      .select("id");
    if (upd.error) {
      console.error(`[fail] update ${from} → ${to}: ${upd.error.message}`);
      continue;
    }
    console.log(`[ok] ${from} → ${to} (${upd.data?.length ?? 0} row(s))`);
  }
}

async function main() {
  const mapping = await updateCsv();
  await updateDb(mapping);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
