/**
 * Headless browser check: each bundled preset should produce non-flat WebGL output.
 * Requires: npx playwright (pulled on first run).
 *
 * Usage: node scripts/verify-projectm-presets.mjs [--port 3000]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
function parsePort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--port=')) return Number(a.split('=')[1]);
    if (a === '--port' && argv[i + 1]) return Number(argv[i + 1]);
  }
  return 3099;
}
const port = parsePort(process.argv);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
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
      const st = await stat(filePath);
      if (!st.isFile()) {
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
    const canvas = document.querySelector('#projectm-host canvas');
    if (!canvas) return { std: 0, mean: 0, ok: false };
    const gl = canvas.getContext('webgl2');
    if (!gl) return { std: 0, mean: 0, ok: false };
    const w = canvas.width;
    const h = canvas.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0;
    let sum2 = 0;
    const n = w * h;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const y = 0.299 * buf[o] + 0.587 * buf[o + 1] + 0.114 * buf[o + 2];
      sum += y;
      sum2 += y * y;
    }
    const mean = sum / n;
    const variance = Math.max(0, sum2 / n - mean * mean);
    const std = Math.sqrt(variance);
    return { std, mean, ok: true };
  });
}

async function sampleCanvasMax(page, passes = 4, gapMs = 350) {
  let best = { std: 0, mean: 0, ok: false };
  for (let i = 0; i < passes; i++) {
    await page.waitForTimeout(gapMs);
    const sample = await sampleCanvas(page);
    if (sample.std > best.std) best = sample;
  }
  return best;
}

async function main() {
  const { chromium } = await loadPlaywright();
  const server = createStaticServer(repoRoot);
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const url = `http://127.0.0.1:${port}/gamedude-player.html`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });

    await page.evaluate(() => {
      const gb = document.querySelector('gameboy-console');
      gb?.shadowRoot?.querySelector('.power')?.click();
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
      const gb = document.querySelector('gameboy-console');
      const menu = gb?.shadowRoot?.querySelector('game-dude-menu-screen');
      const ctx = globalThis.Howler?.ctx;
      if (ctx?.state === 'suspended') {
        await ctx.resume();
      }
      if (menu?.catalog?.tracks?.length) {
        menu.catalog.play(0);
        menu.scene = 'playing';
        menu.requestUpdate();
        // Headless Chromium may never report Howler as playing; still drive viz + tap.
        menu.catalog.onPlayStateChange?.(true);
        menu.catalog.audioTap?.start();
      }
    });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const toggle = document.querySelector('#viz-enabled-toggle');
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForFunction(
      () => {
        const btns = [...document.querySelectorAll('.viz-btn')];
        return btns.length >= 2 && btns.every((b) => !b.disabled);
      },
      { timeout: 120_000 },
    );
    await page.waitForTimeout(3500);

    const warmup = await sampleCanvasMax(page, 6, 400);
    if (warmup.std < 8) {
      const diag = await page.evaluate(() => ({
        playing: document
          .querySelector('gameboy-console')
          ?.shadowRoot?.querySelector('game-dude-menu-screen')
          ?.catalog?.currentHowl?.playing?.(),
        canvas: !!document.querySelector('#projectm-host canvas'),
        vizEnabled: document.querySelector('#viz-enabled-toggle')?.checked,
      }));
      console.error('Warmup failed (no visible viz). Diagnostics:', diag);
      process.exitCode = 1;
    }

    const results = [];
    const nextBtn = page.locator('button.viz-btn', { hasText: 'Preset ▶' });
    const count = await page.evaluate(() => {
      const label = document.querySelector('.viz-preset-label')?.textContent ?? '';
      const m = label.match(/Preset \d+\/(\d+)/);
      return m ? Number(m[1]) : 40;
    });

    for (let i = 0; i < count; i++) {
      if (i > 0) {
        await nextBtn.click();
        await page.waitForTimeout(600);
      }
      let label = 'Preset —';
      try {
        await page.waitForFunction(
          () => document.querySelector('.viz-preset-label')?.textContent?.includes('Preset'),
          { timeout: 45_000 },
        );
        label = (await page.locator('.viz-preset-label').textContent({ timeout: 5000 })) ?? label;
      } catch {
        label = `${label} (label timeout)`;
      }
      const { std, mean, ok } = await sampleCanvasMax(page);
      const works = ok && std >= 8;
      results.push({ index: i, label: label?.trim(), std: Number(std.toFixed(2)), mean: Number(mean.toFixed(2)), works });
      process.stdout.write(`${i}\t${works ? 'yes' : 'no '}\tstd=${std.toFixed(1)}\t${label}\n`);
    }

    const failed = results.filter((r) => !r.works);
    const reportPath = join(repoRoot, '.build', 'preset-verify.json');
    await import('node:fs/promises').then(({ mkdir, writeFile }) =>
      mkdir(join(repoRoot, '.build'), { recursive: true }).then(() =>
        writeFile(reportPath, JSON.stringify({ results, threshold: 8 }, null, 2)),
      ),
    );
    console.log(`Wrote ${reportPath}`);
    console.log(`\n${results.length - failed.length}/${results.length} presets passed (luminance std >= 8)`);
    if (failed.length) {
      console.log('Failed indices:', failed.map((f) => f.index).join(', '));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
