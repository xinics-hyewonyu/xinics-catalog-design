/**
 * Dry-run: match figma-links.json entries to DB catalog rows by customer/site name.
 * Outputs a TSV report. NO database writes.
 *
 * Usage:
 *   pnpm dlx tsx scripts/match-figma-links.ts > scripts/match-report.tsv
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

type FigmaRow = {
  filename: string;
  project: string;
  category: string;
  url: string;
};
type CatalogRow = {
  id: string;
  site_name: string;
  customer_name: string;
  design_tool: string | null;
  file_path: string | null;
};

// Normalize Korean university names + common variations.
function normName(s: string): string {
  let x = s.toLowerCase();
  // KAIST aliases
  x = x.replace(/kaist/gi, "카이스트");
  // strip whitespace/punct
  x = x.replace(/[\s_\-()\[\]/+·,.'"]/g, "");
  // strip common school suffixes (longest first)
  x = x.replace(/대학교|교육대학교|여자대학교|이공대학교|과학대학교/g, "");
  x = x.replace(/대학원|연합대학|공유대학|혁신융합대학|글로컬연합대학/g, "");
  x = x.replace(/학교|대학|국립|^립/g, "");
  return x;
}

// Site keyword tokens we care about (English & abbreviation matching)
const SITE_KEYWORDS = [
  "lms",
  "mooc",
  "oer",
  "cms",
  "canvas",
  "hifa",
  "hope",
  "starmooc",
  "openCampus",
  "open캠퍼스",
  "오픈캠퍼스",
  "로그인",
  "메인",
  "서브페이지",
  "예약",
  "아이콘",
  "배지",
  "뱃지",
  "로고",
  "favicon",
  "파비콘",
  "배너",
  "슬라이드",
  "og",
  "hero",
  "aid",
  "uam",
  "kentech",
  "etl",
  "snuon",
  "ycampus",
  "ecampus",
  "ex-campus",
  "icampus",
  "stoc",
  "csm",
  "share",
  "admit",
  "라이선스",
  "마이페이지",
  "게시판",
  "헤더",
];

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s_\-()\[\]/+·,.'"]+/)
    .filter((t) => t.length >= 2);
}

function scoreMatch(
  figma: FigmaRow,
  catalog: CatalogRow,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const fNorm = normName(figma.filename);
  const cNorm = normName(catalog.customer_name);
  const sNorm = normName(catalog.site_name);

  let score = 0;

  // Customer match
  if (cNorm.length >= 2 && fNorm.includes(cNorm)) {
    score += 100;
    reasons.push(`customer "${catalog.customer_name}" in filename`);
  } else if (cNorm.length >= 2) {
    // partial: first 3 chars
    const prefix = cNorm.slice(0, 3);
    if (prefix.length >= 2 && fNorm.includes(prefix)) {
      score += 30;
      reasons.push(`customer prefix "${prefix}" in filename`);
    }
  }

  // Site name match (whole or token-by-token)
  if (sNorm.length >= 2 && fNorm.includes(sNorm)) {
    score += 80;
    reasons.push(`site "${catalog.site_name}" in filename`);
  } else {
    const sTokens = tokens(catalog.site_name);
    const fTokens = new Set(tokens(figma.filename));
    let hits = 0;
    for (const t of sTokens) {
      if (fTokens.has(t)) hits++;
    }
    if (hits > 0) {
      score += hits * 15;
      reasons.push(`${hits} site-token hit(s)`);
    }
  }

  // Category bonus
  const catL = figma.category.toLowerCase();
  const siteL = catalog.site_name.toLowerCase();
  const map: Record<string, string[]> = {
    로그인: ["로그인", "login"],
    lms: ["lms"],
    mooc: ["mooc"],
    오픈캠퍼스: ["오픈캠퍼스", "open camp"],
    "og/대표이미지": ["og"],
  };
  for (const k of Object.keys(map)) {
    if (catL.includes(k.toLowerCase())) {
      for (const kw of map[k]) {
        if (siteL.includes(kw)) {
          score += 20;
          reasons.push(`category "${figma.category}" ↔ site keyword`);
          break;
        }
      }
    }
  }

  return { score, reasons };
}

async function main() {
  const figmaRows: FigmaRow[] = JSON.parse(
    fs.readFileSync(path.resolve("scripts/figma-links.json"), "utf-8"),
  );

  const { data: catalogs, error } = await supabase
    .from("catalogs")
    .select("id, site_name, customer_name, design_tool, file_path, deleted_at")
    .is("deleted_at", null);
  if (error || !catalogs) {
    console.error("query failed:", error);
    process.exit(1);
  }

  // For each figma row, find best matching catalog
  type Result = {
    figmaIdx: number;
    figmaName: string;
    figmaCategory: string;
    figmaUrl: string;
    catalogId: string | null;
    customer: string | null;
    site: string | null;
    score: number;
    confidence: "HIGH" | "MED" | "LOW" | "NONE";
    reasons: string;
    note: string;
  };

  const results: Result[] = [];

  figmaRows.forEach((fig, idx) => {
    let best: { c: CatalogRow; score: number; reasons: string[] } | null = null;
    let runnerUp = 0;
    for (const c of catalogs as CatalogRow[]) {
      const { score, reasons } = scoreMatch(fig, c);
      if (!best || score > best.score) {
        runnerUp = best?.score ?? 0;
        best = { c, score, reasons };
      } else if (score > runnerUp) {
        runnerUp = score;
      }
    }
    const score = best?.score ?? 0;
    let confidence: Result["confidence"];
    if (score >= 150) confidence = "HIGH";
    else if (score >= 100) confidence = "MED";
    else if (score >= 50) confidence = "LOW";
    else confidence = "NONE";

    const note: string[] = [];
    if (best && best.c.file_path) {
      note.push(`기존 file_path 있음: ${best.c.file_path.slice(0, 40)}`);
    }
    if (best && runnerUp >= score - 20 && runnerUp >= 80) {
      note.push(`경쟁 후보 점수 ${runnerUp} (애매)`);
    }

    results.push({
      figmaIdx: idx + 1,
      figmaName: fig.filename,
      figmaCategory: fig.category,
      figmaUrl: fig.url,
      catalogId: confidence === "NONE" ? null : best?.c.id ?? null,
      customer: confidence === "NONE" ? null : best?.c.customer_name ?? null,
      site: confidence === "NONE" ? null : best?.c.site_name ?? null,
      score,
      confidence,
      reasons: best?.reasons.join("; ") ?? "",
      note: note.join(" | "),
    });
  });

  // Output
  console.log(
    [
      "idx",
      "confidence",
      "score",
      "figma_filename",
      "figma_category",
      "match_customer",
      "match_site",
      "reasons",
      "note",
      "figma_url",
      "catalog_id",
    ].join("\t"),
  );
  for (const r of results) {
    console.log(
      [
        r.figmaIdx,
        r.confidence,
        r.score,
        r.figmaName,
        r.figmaCategory,
        r.customer ?? "",
        r.site ?? "",
        r.reasons,
        r.note,
        r.figmaUrl,
        r.catalogId ?? "",
      ].join("\t"),
    );
  }

  // Summary to stderr
  const counts = { HIGH: 0, MED: 0, LOW: 0, NONE: 0 };
  for (const r of results) counts[r.confidence]++;
  console.error("");
  console.error(`총 figma rows: ${results.length}`);
  console.error(
    `HIGH: ${counts.HIGH}, MED: ${counts.MED}, LOW: ${counts.LOW}, NONE: ${counts.NONE}`,
  );

  // ===== Plan: HIGH + non-conflicting + no existing file_path =====
  // Group all matches by catalog_id (including non-HIGH for conflict check)
  const allByCatalog = new Map<string, Result[]>();
  for (const r of results) {
    if (!r.catalogId) continue;
    if (!allByCatalog.has(r.catalogId)) allByCatalog.set(r.catalogId, []);
    allByCatalog.get(r.catalogId)!.push(r);
  }

  const catalogById = new Map<string, CatalogRow>();
  for (const c of catalogs as CatalogRow[]) catalogById.set(c.id, c);

  const autoApply: Array<{
    catalog_id: string;
    customer: string;
    site: string;
    figma_filename: string;
    figma_url: string;
    figma_idx: number;
  }> = [];
  const skipped: Array<{ reason: string; results: Result[] }> = [];

  for (const [cid, rs] of allByCatalog) {
    const cat = catalogById.get(cid)!;
    const highs = rs.filter((r) => r.confidence === "HIGH");
    if (highs.length === 0) continue; // not eligible
    if (cat.file_path) {
      skipped.push({ reason: "기존 file_path 있음 (덮어쓰지 않음)", results: highs });
      continue;
    }
    if (highs.length === 1 && rs.length === 1) {
      // single match, single HIGH — clear
      const r = highs[0];
      autoApply.push({
        catalog_id: cid,
        customer: r.customer!,
        site: r.site!,
        figma_filename: r.figmaName,
        figma_url: r.figmaUrl,
        figma_idx: r.figmaIdx,
      });
    } else if (highs.length === 1 && rs.length > 1) {
      // HIGH 1개지만 같은 catalog에 다른 figma(낮은 점수)도 매칭 — 모호
      skipped.push({
        reason: "같은 catalog에 다른 figma도 매칭됨 (버전/시안 구분 모호)",
        results: rs,
      });
    } else {
      // multiple HIGHs — definitely ambiguous
      skipped.push({
        reason: "한 catalog에 HIGH 매칭 여러 개 (버전 구분 불가)",
        results: rs,
      });
    }
  }

  // Save plan JSON
  fs.writeFileSync(
    path.resolve("scripts/figma-apply-plan.json"),
    JSON.stringify(autoApply, null, 2),
  );
  // Save skipped (for manual review)
  fs.writeFileSync(
    path.resolve("scripts/figma-skipped.json"),
    JSON.stringify(
      skipped.map((s) => ({
        reason: s.reason,
        catalog: {
          id: s.results[0]?.catalogId,
          customer: s.results[0]?.customer,
          site: s.results[0]?.site,
        },
        candidates: s.results.map((r) => ({
          figma_idx: r.figmaIdx,
          confidence: r.confidence,
          score: r.score,
          figma_filename: r.figmaName,
          figma_category: r.figmaCategory,
          figma_url: r.figmaUrl,
        })),
      })),
      null,
      2,
    ),
  );

  console.error("");
  console.error(`자동 적용 후보 (HIGH + 단일 매칭 + 기존 file_path 없음): ${autoApply.length}건`);
  for (const a of autoApply) {
    console.error(`  ✓ [${a.figma_idx}] ${a.customer} / ${a.site} ← ${a.figma_filename}`);
  }
  console.error("");
  console.error(`수동 검토 필요 (HIGH지만 모호하거나 기존 file_path 충돌): ${skipped.length} catalog`);
  for (const s of skipped) {
    const r0 = s.results[0];
    console.error(`  ⚠ ${r0.customer} / ${r0.site} — ${s.reason}`);
    for (const r of s.results) {
      console.error(`      [${r.figmaIdx}] ${r.confidence} ${r.score} ${r.figmaName}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
