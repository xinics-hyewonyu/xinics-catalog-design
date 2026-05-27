/**
 * Capture viewport-sized screenshots of every catalog_url in
 * bulk-upload/catalogs.csv that doesn't yet have an image_filename, save the
 * PNGs into bulk-upload/images/, and update the CSV's image_filename column
 * in place so scripts/bulk-upload.ts will pick them up.
 *
 * Usage:
 *   pnpm dlx tsx scripts/screenshot-sites.ts
 *
 * Re-running is safe: rows that already have image_filename are skipped.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext } from "playwright";

const ROOT = path.resolve("bulk-upload");
const CSV_PATH = path.join(ROOT, "catalogs.csv");
const IMG_DIR = path.join(ROOT, "images");

const VIEWPORT = { width: 1920, height: 1080 } as const;
const NAV_TIMEOUT_MS = 25_000;
const SETTLE_MS = 1_500;

/** Minimal RFC4180-ish CSV parser. */
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

function encodeCsvCell(value: string): string {
  if (value === "") return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv(rows: string[][]): string {
  return rows.map((r) => r.map(encodeCsvCell).join(",")).join("\n") + "\n";
}

async function capture(
  context: BrowserContext,
  url: string,
  outPath: string,
): Promise<string | null> {
  // Fresh page per URL — reusing a single page across 100+ sites
  // accumulates pending redirects / dialogs / service-worker state that
  // eventually breaks every subsequent goto with
  // "Navigation interrupted by another navigation".
  const page = await context.newPage();
  try {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (err) {
      return `goto: ${err instanceof Error ? err.message : String(err)}`;
    }
    // Give it a moment to render hero / fonts / lazy images, then nudge a
    // scroll so lazy-loaded sections below the fold start fetching.
    await page.waitForTimeout(SETTLE_MS);
    try {
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.9;
        let y = 0;
        const max = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        );
        while (y < max) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
          y += step;
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 300));
      });
    } catch {
      // ignore — fallback to whatever rendered without the lazy nudge
    }
    try {
      await page.screenshot({ path: outPath, type: "png", fullPage: true });
    } catch (err) {
      return `screenshot: ${err instanceof Error ? err.message : String(err)}`;
    }
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  let raw = await fs.readFile(CSV_PATH, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const rows = parseCsv(raw).filter(
    (r) => r.length > 1 || (r[0] && r[0].trim() !== ""),
  );
  if (rows.length < 2) throw new Error("CSV is empty");

  const headers = rows[0].map((h) => h.trim());
  const idx = (col: string) => headers.indexOf(col);
  const imageCol = idx("image_filename");
  const urlCol = idx("catalog_url");
  const siteNameCol = idx("site_name");
  if (imageCol < 0 || urlCol < 0) {
    throw new Error("CSV must have image_filename + catalog_url columns");
  }

  await fs.mkdir(IMG_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  let success = 0;
  let skipped = 0;
  let failure = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const existing = (row[imageCol] ?? "").trim();
    const url = (row[urlCol] ?? "").trim();
    const siteName = (row[siteNameCol] ?? "").trim();
    const tag = `row ${i + 1} (${siteName || url})`;

    if (existing) {
      skipped++;
      console.log(`[skip] ${tag}: already has ${existing}`);
      continue;
    }
    if (!url) {
      skipped++;
      console.log(`[skip] ${tag}: no catalog_url`);
      continue;
    }

    const filename = `cap-${String(i).padStart(3, "0")}.png`;
    const outPath = path.join(IMG_DIR, filename);
    process.stdout.write(`[cap]  ${tag}: ${url} … `);
    const err = await capture(context, url, outPath);
    if (err) {
      console.log(`FAIL — ${err}`);
      failure++;
      continue;
    }
    row[imageCol] = filename;
    console.log(`saved → ${filename}`);
    success++;

    // Persist progress every 10 successful captures so a mid-run crash
    // doesn't lose work.
    if (success % 10 === 0) {
      await fs.writeFile(CSV_PATH, writeCsv(rows), "utf-8");
    }
  }

  await fs.writeFile(CSV_PATH, writeCsv(rows), "utf-8");
  await browser.close();
  console.log(
    `\nDone. captured=${success} skipped=${skipped} failed=${failure}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
