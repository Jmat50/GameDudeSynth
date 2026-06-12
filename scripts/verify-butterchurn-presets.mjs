/**
 * Headless browser check: sampled presets should load and produce non-flat canvas output.
 *
 * Usage: node scripts/verify-butterchurn-presets.mjs [--port 3000] [--sample=30]
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function parseArg(argv, name, fallback) {
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg.startsWith(`${name}=`)) return arg.split('=')[1];
    if (arg === name && argv[index + 1]) return argv[index + 1];
  }
  return fallback;
}

const port = Number(parseArg(process.argv, '--port', '3099'));
const sampleSize = Number(parseArg(process.argv, '--sample', '30'));

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wav': 'audio/wav',
  '.json': 'application/json',
};

function createStaticServer(root) {
  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      if (urlPath === '/') urlPath = '/gamedude-player.html';
      const rel = normalize(urlPath.replace(/^\/+/, ''));
      if (rel.startsWith('..')) {
        res.writeHead(403);
        res.end();
        return;
      }
      const filePath = join(root, rel);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      const ext = rel.slice(rel.lastIndexOf('.'));
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}

function loadCatalog() {
  const catalogPath = join(repoRoot, 'public', 'vendor', 'butterchurn', 'preset-catalog.json');
  const metaPath = join(repoRoot, 'public', 'vendor', 'butterchurn', 'preset-catalog-meta.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
  return { catalog, meta };
}

function pickSamplePresets(catalog, meta, sampleLimit) {
  const byPack = new Map();
  for (const entry of catalog) {
    for (const packId of entry.packs ?? []) {
      if (!byPack.has(packId)) byPack.set(packId, []);
      byPack.get(packId).push(entry);
    }
  }

  const picked = [];
  const seen = new Set();

  for (const pack of meta?.packs ?? []) {
    const entries = byPack.get(pack.id) ?? [];
    if (!entries.length) continue;
    const entry = entries[0];
    if (!seen.has(entry.slug)) {
      seen.add(entry.slug);
      picked.push({ packId: pack.id, entry });
    }
  }

  const remaining = catalog.filter((entry) => !seen.has(entry.slug));
  const stride = Math.max(1, Math.ceil(remaining.length / Math.max(1, sampleLimit - picked.length)));
  for (let index = 0; index < remaining.length && picked.length < sampleLimit; index += stride) {
    const entry = remaining[index];
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    picked.push({ packId: entry.packs?.[0] ?? 'other', entry });
  }

  return picked.slice(0, sampleLimit);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('Install playwright: npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}

async function sampleCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#viz-host canvas');
    if (!canvas) return { std: 0, mean: 0, ok: false };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { std: 0, mean: 0, ok: false };
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return { std: 0, mean: 0, ok: false };
    const buffer = ctx.getImageData(0, 0, width, height).data;
    let sum = 0;
    let sum2 = 0;
    const pixels = width * height;
    for (let index = 0; index < pixels; index++) {
      const offset = index * 4;
      const luminance =
        0.299 * buffer[offset] + 0.587 * buffer[offset + 1] + 0.114 * buffer[offset + 2];
      sum += luminance;
      sum2 += luminance * luminance;
    }
    const mean = sum / pixels;
    const variance = Math.max(0, sum2 / pixels - mean * mean);
    return { std: Math.sqrt(variance), mean, ok: true };
  });
}

async function sampleCanvasMax(page, passes = 12, gapMs = 500) {
  let best = { std: 0, mean: 0, ok: false };
  for (let index = 0; index < passes; index++) {
    await page.waitForTimeout(gapMs);
    const sample = await sampleCanvas(page);
    if (sample.std > best.std) best = sample;
  }
  return best;
}

async function selectPreset(page, packId, slug) {
  await page.evaluate(
    ({ nextPack, nextSlug }) => {
      const packSelect = document.querySelector('.viz-pack-select');
      const presetSelect = document.querySelector('.viz-preset-select');
      if (packSelect) {
        packSelect.value = nextPack;
        packSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (presetSelect) {
        presetSelect.value = nextSlug;
        presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { nextPack: packId, nextSlug: slug },
  );
}

async function main() {
  const { catalog, meta } = loadCatalog();
  const targets = pickSamplePresets(catalog, meta, sampleSize);
  console.log(`Verifying ${targets.length} presets (sample limit ${sampleSize})`);

  const { chromium } = await loadPlaywright();
  const server = createStaticServer(repoRoot);
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const url = `http://127.0.0.1:${port}/gamedude-player.html`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });

    await page.evaluate(() => {
      localStorage.removeItem('gamedude.vizPack');
      localStorage.removeItem('gamedude.vizPresetSlug');
      localStorage.removeItem('gamedude.vibe');
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 120_000 });

    await page.evaluate(() => {
      const gameboy = document.querySelector('gameboy-console');
      gameboy?.shadowRoot?.querySelector('.power')?.click();
    });
    await page.waitForFunction(
      () => {
        const menu = document
          .querySelector('gameboy-console')
          ?.shadowRoot?.querySelector('game-dude-menu-screen');
        return (menu?.tracks?.length ?? 0) > 0;
      },
      { timeout: 60_000 },
    );

    await page.evaluate(async () => {
      const gameboy = document.querySelector('gameboy-console');
      const menu = gameboy?.shadowRoot?.querySelector('game-dude-menu-screen');
      const audioContext = globalThis.Howler?.ctx;
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      if (menu?.catalog?.tracks?.length) {
        menu.catalog.play(0);
        menu.scene = 'playing';
        menu.requestUpdate();
        menu.catalog.onPlayStateChange?.(true);
      }
    });

    await page.evaluate(() => {
      const toggle = document.querySelector('#viz-enabled-toggle');
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.waitForFunction(
      () => {
        const packSelect = document.querySelector('.viz-pack-select');
        const presetSelect = document.querySelector('.viz-preset-select');
        return (
          packSelect &&
          presetSelect &&
          !packSelect.disabled &&
          !presetSelect.disabled &&
          packSelect.options.length > 0 &&
          presetSelect.options.length > 0
        );
      },
      { timeout: 120_000 },
    );
    await page.waitForFunction(
      () => document.querySelector('#viz-host')?.dataset.vizPresetSlug,
      { timeout: 120_000 },
    );

    const results = [];
    for (const target of targets) {
      await selectPreset(page, target.packId, target.entry.slug);
      await page.waitForFunction(
        (expectedSlug) => document.querySelector('#viz-host')?.dataset.vizPresetSlug === expectedSlug,
        target.entry.slug,
        { timeout: 45_000 },
      );
      await page.waitForTimeout(2_000);
      let sample = await sampleCanvasMax(page);
      if (!sample.ok || sample.std < 8) {
        await page.waitForTimeout(3_000);
        sample = await sampleCanvasMax(page, 16, 500);
      }
      const works = sample.ok && sample.std >= 8;
      results.push({
        packId: target.packId,
        slug: target.entry.slug,
        key: target.entry.key,
        std: Number(sample.std.toFixed(2)),
        mean: Number(sample.mean.toFixed(2)),
        works,
      });
      process.stdout.write(
        `${target.entry.slug}\t${works ? 'yes' : 'no '}\tpack=${target.packId}\tstd=${sample.std.toFixed(1)}\n`,
      );
    }

    const failed = results.filter((result) => !result.works);
    if (failed.length) {
      console.error('Presets with flat canvas output:', failed);
      process.exitCode = 1;
    }

    const reportPath = join(repoRoot, '.build', 'preset-verify.json');
    await mkdir(join(repoRoot, '.build'), { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify({ results, threshold: 8, sampleSize: targets.length }, null, 2),
    );
    console.log(`Wrote ${reportPath}`);
    console.log(`${results.length - failed.length}/${results.length} presets passed`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
