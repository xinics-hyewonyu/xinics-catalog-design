/**
 * Bulk upload catalogs from bulk-upload/catalogs.csv + bulk-upload/images/.
 *
 * Usage:
 *   pnpm dlx tsx scripts/bulk-upload.ts
 *
 * See bulk-upload/README.md for the CSV format.
 */
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
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

const BUCKET = "catalog-images";
const ROOT = path.resolve("bulk-upload");
const CSV_PATH = path.join(ROOT, "catalogs.csv");
const IMG_DIR = path.join(ROOT, "images");

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const REQUIRED_HEADERS = ["site_name", "customer_name"];
const ALL_HEADERS = [
  "image_filename",
  "site_name",
  "customer_name",
  "proposal_type",
  "site_type",
  "design_tool",
  "file_path",
  "catalog_url",
  "memo",
] as const;
type ColName = (typeof ALL_HEADERS)[number];

/** Minimal RFC4180-ish CSV parser. Handles quoted cells, escaped quotes, CRLF. */
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
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function nullish(v: string | undefined): string | null {
  if (v == null) return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
}

async function main() {
  // Load CSV
  let raw: string;
  try {
    raw = await fs.readFile(CSV_PATH, "utf-8");
  } catch {
    console.error(`Couldn't read ${CSV_PATH} — see bulk-upload/README.md`);
    process.exit(1);
  }
  // Strip UTF-8 BOM Excel sometimes emits
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error("CSV must contain a header row and at least one data row.");
    process.exit(1);
  }
  const headers = rows[0].map((h) => h.trim());
  for (const req of REQUIRED_HEADERS) {
    if (!headers.includes(req)) {
      console.error(`Missing required CSV column: ${req}`);
      process.exit(1);
    }
  }
  const headerIndex = new Map<ColName, number>();
  for (const col of ALL_HEADERS) {
    const idx = headers.indexOf(col);
    if (idx >= 0) headerIndex.set(col, idx);
  }

  // Type slug → UUID maps
  const [pt, st] = await Promise.all([
    supabase.from("catalog_proposal_types").select("id, slug"),
    supabase.from("catalog_site_types").select("id, slug"),
  ]);
  if (pt.error || st.error) {
    console.error("type lookup failed", pt.error, st.error);
    process.exit(1);
  }
  const proposalMap = new Map(
    (pt.data ?? []).map((t) => [t.slug, t.id] as const),
  );
  const siteMap = new Map((st.data ?? []).map((t) => [t.slug, t.id] as const));

  let success = 0;
  let failure = 0;

  for (let lineNo = 1; lineNo < rows.length; lineNo++) {
    const row = rows[lineNo];
    const get = (col: ColName): string | undefined => {
      const idx = headerIndex.get(col);
      if (idx == null) return undefined;
      return row[idx];
    };
    const tag = `row ${lineNo + 1}`;

    const imageFilename = (get("image_filename") ?? "").trim();
    const siteName = (get("site_name") ?? "").trim();
    const customerName = (get("customer_name") ?? "").trim();
    const proposalSlug = (get("proposal_type") ?? "").trim();
    if (!siteName || !customerName) {
      console.error(
        `[fail] ${tag}: missing required field (site_name/customer_name)`,
      );
      failure++;
      continue;
    }
    let proposalUuid: string | null = null;
    if (proposalSlug) {
      const found = proposalMap.get(proposalSlug);
      if (!found) {
        console.error(
          `[fail] ${tag}: unknown proposal_type "${proposalSlug}" (expected: ${Array.from(proposalMap.keys()).join(", ")})`,
        );
        failure++;
        continue;
      }
      proposalUuid = found;
    }
    const siteSlug = (get("site_type") ?? "").trim();
    let siteUuid: string | null = null;
    if (siteSlug) {
      const found = siteMap.get(siteSlug);
      if (!found) {
        console.error(
          `[fail] ${tag}: unknown site_type "${siteSlug}" (expected: ${Array.from(siteMap.keys()).join(", ")})`,
        );
        failure++;
        continue;
      }
      siteUuid = found;
    }

    const id = randomUUID();

    // Image is optional — rows without an image will be created with
    // image_url=null (the card falls back to the placeholder).
    let publicUrl: string | null = null;
    let objectPath: string | null = null;
    if (imageFilename) {
      const localImagePath = path.join(IMG_DIR, imageFilename);
      let bytes: Buffer;
      try {
        bytes = await fs.readFile(localImagePath);
      } catch {
        console.error(`[fail] ${tag}: image not found at ${localImagePath}`);
        failure++;
        continue;
      }
      const ext = path.extname(imageFilename).toLowerCase();
      const contentType = CONTENT_TYPE[ext];
      if (!contentType) {
        console.error(
          `[fail] ${tag}: unsupported image type "${ext}" (jpg/png/webp만 가능)`,
        );
        failure++;
        continue;
      }
      objectPath = `${id}/original${ext}`;
      const up = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, bytes, { contentType, upsert: false });
      if (up.error) {
        console.error(`[fail] ${tag}: storage upload — ${up.error.message}`);
        failure++;
        continue;
      }
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(objectPath);
      publicUrl = urlData.publicUrl;
    }

    const insertPayload = {
      id,
      site_name: siteName,
      customer_name: customerName,
      proposal_type_id: proposalUuid,
      site_type_id: siteUuid,
      design_tool: nullish(get("design_tool")),
      file_path: nullish(get("file_path")),
      catalog_url: nullish(get("catalog_url")),
      memo: nullish(get("memo")),
      image_url: publicUrl,
      thumbnail_url: publicUrl,
    };

    const ins = await supabase.from("catalogs").insert(insertPayload);
    if (ins.error) {
      if (objectPath) {
        await supabase.storage
          .from(BUCKET)
          .remove([objectPath])
          .catch(() => {});
      }
      console.error(`[fail] ${tag}: row insert — ${ins.error.message}`);
      failure++;
      continue;
    }

    const log = await supabase.from("catalog_edit_logs").insert({
      catalog_id: id,
      action: "created",
      changes: { snapshot: insertPayload, source: "bulk-upload" },
    });
    if (log.error) {
      console.warn(
        `[warn] ${tag}: edit-log insert failed (row still saved): ${log.error.message}`,
      );
    }

    console.log(`[ok]   ${tag}: ${siteName}`);
    success++;
  }

  console.log(`\nBulk upload done. success=${success} failure=${failure}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
