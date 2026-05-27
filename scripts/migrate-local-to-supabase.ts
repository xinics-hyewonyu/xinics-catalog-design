/**
 * One-shot migration: copy user-uploaded catalogs from /data/catalogs.json
 * + /public/uploads/ into Supabase (Storage bucket 'catalog-images' +
 * 'catalogs' table). 'demo-*' rows are skipped.
 *
 * Usage:
 *   pnpm dlx tsx scripts/migrate-local-to-supabase.ts
 */
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

const CONTENT_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function main() {
  const dataPath = path.resolve("data/catalogs.json");
  const raw = JSON.parse(await fs.readFile(dataPath, "utf-8")) as Array<
    Record<string, unknown>
  >;
  const userRows = raw.filter(
    (r) => typeof r.id === "string" && !(r.id as string).startsWith("demo-"),
  );
  console.log(`User-uploaded rows to migrate: ${userRows.length}`);

  // slug → uuid lookup
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

  for (const row of userRows) {
    const id = row.id as string;
    const imageUrl = row.image_url as string | null;
    if (!imageUrl) {
      console.warn(`[skip] ${id}: no image_url`);
      failure++;
      continue;
    }
    const localImagePath = path.resolve(
      "public",
      imageUrl.replace(/^\//, ""),
    );
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(localImagePath);
    } catch {
      console.warn(`[skip] ${id}: image not found at ${localImagePath}`);
      failure++;
      continue;
    }

    const ext = path.extname(imageUrl).toLowerCase();
    const contentType = CONTENT_TYPE[ext] ?? "application/octet-stream";
    const objectPath = `${id}/original${ext}`;

    const up = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType, upsert: true });
    if (up.error) {
      console.error(`[fail] ${id}: storage upload — ${up.error.message}`);
      failure++;
      continue;
    }
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;

    const proposalSlug = row.proposal_type_id as string | null;
    const siteSlug = row.site_type_id as string | null;
    const proposalUuid = proposalSlug ? (proposalMap.get(proposalSlug) ?? null) : null;
    const siteUuid = siteSlug ? (siteMap.get(siteSlug) ?? null) : null;

    const insert = await supabase.from("catalogs").upsert(
      {
        id,
        site_name: (row.site_name as string) ?? "",
        customer_name: (row.customer_name as string) ?? "",
        proposal_type_id: proposalUuid,
        site_type_id: siteUuid,
        design_tool: (row.design_tool as string | null) ?? null,
        file_path: (row.file_path as string | null) ?? null,
        catalog_url: (row.catalog_url as string | null) ?? null,
        memo: (row.memo as string | null) ?? null,
        image_url: publicUrl,
        thumbnail_url: publicUrl,
        created_at: (row.created_at as string) ?? undefined,
        updated_at: (row.updated_at as string) ?? undefined,
        deleted_at: (row.deleted_at as string | null) ?? null,
      },
      { onConflict: "id" },
    );
    if (insert.error) {
      console.error(`[fail] ${id}: insert — ${insert.error.message}`);
      failure++;
      continue;
    }
    console.log(`[ok]   ${id}: ${row.site_name}`);
    success++;
  }

  console.log(`\nMigration done. success=${success} failure=${failure}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
