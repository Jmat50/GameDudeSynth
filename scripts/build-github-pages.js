/**
 * Assemble GameDudeSynth under /GameDudeSynth/ for jmat50.github.io.
 * Run after build:all, demos:manifest, and verify-projectm-vendor.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'github-pages');
const siteRoot = join(out, 'GameDudeSynth');

const PROJECTM_FILES = ['projectm.js', 'projectm.wasm', 'projectm.data', 'bundled-presets.json'];

function assertProjectMBundle() {
  const vendorDir = join(root, 'public', 'vendor', 'projectm');
  for (const name of PROJECTM_FILES) {
    const path = join(vendorDir, name);
    if (!existsSync(path)) {
      throw new Error(`Missing ${path} — run scripts/build-projectm-wasm.ps1 then commit public/vendor/projectm/`);
    }
  }
}

/** Cache-bust static assets on the live demo (Pages CDN + browser caches). */
function writePlayerHtml(destPath) {
  const cacheVersion =
    process.env.GITHUB_SHA?.slice(0, 7) ?? new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  let html = readFileSync(join(root, 'gamedude-player.html'), 'utf8');
  html = html.replace(/((?:href|src)="\.\/[^"?]+)(\?[^"]*)?(")/g, `$1?v=${cacheVersion}$3`);
  writeFileSync(destPath, html, 'utf8');
}

function copyProjectMIntoPagesPublic() {
  const srcDir = join(root, 'public', 'vendor', 'projectm');
  const destDir = join(siteRoot, 'public', 'vendor', 'projectm');
  mkdirSync(destDir, { recursive: true });
  for (const name of PROJECTM_FILES) {
    copyFileSync(join(srcDir, name), join(destDir, name));
  }
  const readme = join(srcDir, 'README.md');
  if (existsSync(readme)) {
    copyFileSync(readme, join(destDir, 'README.md'));
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(siteRoot, { recursive: true });

assertProjectMBundle();

copyFileSync(join(root, 'engine.html'), join(siteRoot, 'engine.html'));
writePlayerHtml(join(siteRoot, 'gamedude-player.html'));

cpSync(join(root, 'public'), join(siteRoot, 'public'), { recursive: true });
copyProjectMIntoPagesPublic();

cpSync(join(root, 'src-player'), join(siteRoot, 'src-player'), { recursive: true });
cpSync(
  join(root, 'vendor', 'gameboycss', 'assets'),
  join(siteRoot, 'vendor', 'gameboycss', 'assets'),
  { recursive: true },
);

mkdirSync(join(siteRoot, 'demos'), { recursive: true });
copyFileSync(
  join(siteRoot, 'public', 'demos', 'manifest.json'),
  join(siteRoot, 'demos', 'manifest.json'),
);

const readme = `# GameDudeSynth live demo

Auto-deployed from [GameDudeSynth](https://github.com/Jmat50/GameDudeSynth).
Do not edit here — push changes to the source repo instead.

- **MIDI export:** https://jmat50.github.io/GameDudeSynth/engine.html
- **WAV player:** https://jmat50.github.io/GameDudeSynth/gamedude-player.html
`;
writeFileSync(join(siteRoot, 'README.md'), readme, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');

const manifest = {
  builtAt: new Date().toISOString(),
  projectm: Object.fromEntries(
    PROJECTM_FILES.map((name) => {
      const path = join(siteRoot, 'public', 'vendor', 'projectm', name);
      return [name, statSync(path).size];
    }),
  ),
};
writeFileSync(join(siteRoot, 'public', 'vendor', 'projectm', 'pages-manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`GitHub Pages site written to ${siteRoot}`);
for (const [name, bytes] of Object.entries(manifest.projectm)) {
  console.log(`  projectm/${name}: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
}
