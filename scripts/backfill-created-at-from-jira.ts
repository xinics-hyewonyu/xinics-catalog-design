/**
 * One-off: rewrite `catalogs.created_at` to match the resolutiondate of the
 * matching "퍼블리싱" issue in Jira. Mapping is hand-curated below from a
 * search of all status=Done "퍼블리싱" issues across xinics.atlassian.net.
 *
 * Usage:
 *   pnpm dlx tsx scripts/backfill-created-at-from-jira.ts            # dry-run
 *   pnpm dlx tsx scripts/backfill-created-at-from-jira.ts --apply
 *
 * Where multiple Jira issues map to the same catalog row (e.g. main page +
 * sub page of the same site), the earliest resolutiondate is treated as the
 * site's opening date.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

function readEnvLocal(): Record<string, string> {
  const raw = require("node:fs").readFileSync(path.resolve(".env.local"), "utf-8");
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

interface Mapping {
  jira: string;
  catalogId: string;
  catalogLabel: string;
  resolutionIso: string;
  note?: string;
}

// Curated mapping. When a catalog has multiple "퍼블리싱" issues, only the
// earliest is listed (the others would be skipped during the merge step).
const MAPPING: Mapping[] = [
  {
    jira: "PL-15",
    catalogId: "8700fc54-0f1d-4642-b25d-f73cc59ef237",
    catalogLabel: "경희대학교 / 경희대학교 e-campus",
    resolutionIso: "2022-03-02T11:21:50.876+09:00",
  },
  {
    jira: "PL-1516",
    catalogId: "a7a464f0-f446-418d-9927-9e39e3ae3c5b",
    catalogLabel: "한국에너지공과대학교 / KENTECH LMS Catalog",
    resolutionIso: "2024-04-01T10:11:26.585+09:00",
  },
  {
    jira: "PL-1532",
    catalogId: "f62e74f1-5205-442c-96b9-15ea80c3511c",
    catalogLabel: "한국과학창의재단 / 생활과학교실 (kofac)",
    resolutionIso: "2024-04-22T18:17:03.498+09:00",
    note: "kofac vs kosac 모호 — kofac으로 추정",
  },
  {
    jira: "HDCC-8",
    catalogId: "a1717090-7252-4379-93ee-02137021a14c",
    catalogLabel: "한동대학교 / 한동대학교 HIFA",
    resolutionIso: "2025-01-07T15:12:38.850+09:00",
    note: "HDCC project = 한동대학교 HIFA",
  },
  {
    jira: "HDCC-15",
    catalogId: "79689049-039f-492c-a91b-5907a3fd8725",
    catalogLabel: "한동대학교 / 한동대 분기페이지",
    resolutionIso: "2025-03-05T14:37:12.137+09:00",
    note: "URL 일치 (ecampus.handong.edu)",
  },
  {
    jira: "IROR-15",
    catalogId: "ae4f561d-77d7-4c09-84e5-31adc23319e7",
    catalogLabel: "로봇혁신공유대학 / SHARE 공유교육 플랫폼",
    resolutionIso: "2025-07-01T18:11:26.438+09:00",
  },
  {
    jira: "SSUA-9",
    catalogId: "27b1cb60-1640-431b-b1e6-0f22bb2b462e",
    catalogLabel: "숭실대학교 / 숭실대 ADMIT (입학사정관 연수)",
    resolutionIso: "2025-07-21T14:07:55.488+09:00",
    note: "SSUA project = 입학사정관 카탈로그 구축",
  },
  {
    jira: "IDU-32",
    catalogId: "75e9123f-c972-4cd8-b695-0a149e95d6ba",
    catalogLabel: "인덕대학교 / 인덕대학교 오픈캠퍼스",
    resolutionIso: "2025-10-01T15:12:50.729+09:00",
  },
  {
    jira: "IDU-45",
    catalogId: "52a0681b-18f3-4f61-88d5-2063e6d0fd55",
    catalogLabel: "인덕대학교 / 인덕대 대학 메인",
    resolutionIso: "2025-10-14T15:45:18.902+09:00",
  },
  {
    jira: "HGM-7",
    catalogId: "b7de2275-4a06-4bac-be1c-1fde19a5b3b4",
    catalogLabel: "한동대학교 / 한동대학교 HOPE",
    resolutionIso: "2025-10-31T18:58:12.029+09:00",
  },
  {
    jira: "YNCOPEN-7",
    catalogId: "78d816fd-539c-44a4-b4d7-79c49fb6f796",
    catalogLabel: "영남이공대학교 / RISE 초광역 학점교류 플랫폼",
    resolutionIso: "2025-12-09T10:08:58.894+09:00",
    note: "YNCOPEN project = 영남이공대학교 오픈캠퍼스 구축",
  },
  {
    jira: "HJZU-10",
    catalogId: "ceeef613-f13b-4de6-98d2-7c0f73612283",
    catalogLabel: "경성대학교 / 경성대학교 오픈캠퍼스",
    resolutionIso: "2025-12-22T10:03:43.557+09:00",
  },
];

async function main() {
  const ids = MAPPING.map((m) => m.catalogId);
  const { data: existing, error } = await supabase
    .from("catalogs")
    .select("id, site_name, customer_name, created_at")
    .in("id", ids);
  if (error) throw error;
  const byId = new Map(existing!.map((r) => [r.id, r] as const));

  console.log(`Plan: update created_at on ${MAPPING.length} catalog row(s)`);
  console.log("----");
  let missing = 0;
  for (const m of MAPPING) {
    const row = byId.get(m.catalogId);
    if (!row) {
      console.log(`[MISSING] ${m.jira} → catalog ${m.catalogId} not found`);
      missing++;
      continue;
    }
    console.log(
      `${m.jira.padEnd(10)} | ${m.catalogLabel}\n` +
        `  before: ${row.created_at}\n` +
        `  after:  ${m.resolutionIso}` +
        (m.note ? `\n  note:   ${m.note}` : ""),
    );
  }
  console.log("----");
  if (missing > 0) {
    console.log(`${missing} mapping(s) point to a missing catalog. Stopping.`);
    process.exit(1);
  }

  if (!APPLY) {
    console.log("Dry-run only. Pass --apply to write.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const m of MAPPING) {
    const row = byId.get(m.catalogId)!;
    const upd = await supabase
      .from("catalogs")
      .update({ created_at: m.resolutionIso })
      .eq("id", m.catalogId)
      .select("id, created_at");
    if (upd.error) {
      console.error(`[fail] ${m.jira}: ${upd.error.message}`);
      fail++;
      continue;
    }
    const log = await supabase.from("catalog_edit_logs").insert({
      catalog_id: m.catalogId,
      action: "updated",
      changes: {
        source: "backfill-created-at-from-jira",
        jira_issue: m.jira,
        field: "created_at",
        before: row.created_at,
        after: m.resolutionIso,
      },
    });
    if (log.error) {
      console.warn(`[warn] ${m.jira}: log insert failed: ${log.error.message}`);
    }
    console.log(`[ok] ${m.jira} → ${m.catalogLabel}`);
    ok++;
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
