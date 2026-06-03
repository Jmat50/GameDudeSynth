/**
 * Headless browser check: each Vibe option should select a distinct bundled
 * projectM preset and produce non-flat WebGL output.
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
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg.startsWith('--port=')) return Number(arg.split('=')[1]);
    if (arg === '--port' && argv[index + 1]) return Number(argv[index + 1]);
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
    const width = canvas.width;
    const height = canvas.height;
    const buffer = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
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

async function sampleCanvasMax(page, passes = 5, gapMs = 350) {
  let best = { std: 0, mean: 0, ok: false };
  for (let index = 0; index < passes; index++) {
    await page.waitForTimeout(gapMs);
    const sample = await sampleCanvas(page);
    if (sample.std > best.std) best = sample;
  }
  return best;
}

async function selectVibe(page, value) {
  await page.evaluate((nextValue) => {
    const select = document.querySelector('.viz-vibe-select');
    select.value = nextValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
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
      localStorage.removeItem('gamedude.vibe');
      localStorage.removeItem('gamedude.vizAutoShuffle');
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
        menu.catalog.audioTap?.start();
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
        const select = document.querySelector('.viz-vibe-select');
        return select && !select.disabled && select.options.length > 1;
      },
      { timeout: 120_000 },
    );
    await page.waitForFunction(
      () => document.querySelector('#projectm-host')?.dataset.vizPresetIndex,
      { timeout: 120_000 },
    );

    const uiState = await page.evaluate(() => ({
      presetButtonCount: [...document.querySelectorAll('.viz-btn')].filter((button) =>
        /preset|shuffle/i.test(button.textContent ?? ''),
      ).length,
      presetLabelCount: document.querySelectorAll('.viz-preset-label').length,
      autoTextPresent: document.body.textContent.includes('Beat-shuffle'),
    }));
    if (uiState.presetButtonCount || uiState.presetLabelCount || uiState.autoTextPresent) {
      console.error('Preset controls are still visible:', uiState);
      process.exitCode = 1;
      return;
    }

    const vibes = await page.evaluate(() =>
      [...document.querySelectorAll('.viz-vibe-select option')].map((option) => ({
        value: option.value,
        label: option.textContent?.trim() ?? option.value,
      })),
    );
    if (vibes.length < 2) {
      console.error('Expected multiple Vibe options, got:', vibes);
      process.exitCode = 1;
      return;
    }

    const results = [];
    for (const vibe of vibes) {
      await selectVibe(page, vibe.value);
      await page.waitForFunction(
        (expectedVibe) => document.querySelector('#projectm-host')?.dataset.vizVibe === expectedVibe,
        vibe.value,
        { timeout: 45_000 },
      );
      const sample = await sampleCanvasMax(page);
      const state = await page.evaluate(() => ({
        vibe: document.querySelector('#projectm-host')?.dataset.vizVibe,
        presetIndex: document.querySelector('#projectm-host')?.dataset.vizPresetIndex,
      }));
      const works = sample.ok && sample.std >= 8;
      results.push({
        vibe: vibe.value,
        label: vibe.label,
        presetIndex: Number(state.presetIndex),
        std: Number(sample.std.toFixed(2)),
        mean: Number(sample.mean.toFixed(2)),
        works,
      });
      process.stdout.write(
        `${vibe.value}\t${works ? 'yes' : 'no '}\tindex=${state.presetIndex}\tstd=${sample.std.toFixed(1)}\n`,
      );
    }

    const uniquePresetIndexes = new Set(results.map((result) => result.presetIndex));
    const failed = results.filter((result) => !result.works);
    if (uniquePresetIndexes.size !== results.length) {
      console.error('Expected each Vibe to land on a different preset index:', results);
      process.exitCode = 1;
    }
    if (failed.length) {
      console.error('Vibes with flat canvas output:', failed);
      process.exitCode = 1;
    }

    const reportPath = join(repoRoot, '.build', 'vibe-verify.json');
    await import('node:fs/promises').then(({ mkdir, writeFile }) =>
      mkdir(join(repoRoot, '.build'), { recursive: true }).then(() =>
        writeFile(
          reportPath,
          JSON.stringify(
            { results, threshold: 8, uniquePresetIndexes: uniquePresetIndexes.size },
            null,
            2,
          ),
        ),
      ),
    );
    console.log(`Wrote ${reportPath}`);
    console.log(`${results.length - failed.length}/${results.length} Vibes passed`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
