/**
 * Assemble GameDudeSynth under /GameDudeSynth/ for jmat50.github.io.
 * Run after build:all, demos:manifest, and verify-butterchurn-vendor.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'github-pages');
const siteRoot = join(out, 'GameDudeSynth');

const BUTTERCHURN_FILES = ['butterchurn.iife.js', 'preset-catalog.json'];

function assertButterchurnBundle() {
  const vendorDir = join(root, 'public', 'vendor', 'butterchurn');
  for (const name of BUTTERCHURN_FILES) {
    const path = join(vendorDir, name);
    if (!existsSync(path)) {
      throw new Error(`Missing ${path} — run npm run build:butterchurn then commit public/vendor/butterchurn/`);
    }
  }
  const presetsDir = join(vendorDir, 'presets');
  const presetCount = existsSync(presetsDir)
    ? readdirSync(presetsDir).filter((name) => name.endsWith('.json')).length
    : 0;
  if (presetCount < 40) {
    throw new Error(`Expected 40 presets in ${presetsDir}, found ${presetCount}`);
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

function copyButterchurnIntoPagesPublic() {
  const srcDir = join(root, 'public', 'vendor', 'butterchurn');
  const destDir = join(siteRoot, 'public', 'vendor', 'butterchurn');
  mkdirSync(destDir, { recursive: true });
  for (const name of BUTTERCHURN_FILES) {
    copyFileSync(join(srcDir, name), join(destDir, name));
  }
  cpSync(join(srcDir, 'presets'), join(destDir, 'presets'), { recursive: true });
  const imageData = join(srcDir, 'imageData');
  if (existsSync(imageData)) {
    cpSync(imageData, join(destDir, 'imageData'), { recursive: true });
  }
  const readme = join(srcDir, 'README.md');
  if (existsSync(readme)) {
    copyFileSync(readme, join(destDir, 'README.md'));
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(siteRoot, { recursive: true });

assertButterchurnBundle();

copyFileSync(join(root, 'engine.html'), join(siteRoot, 'engine.html'));
writePlayerHtml(join(siteRoot, 'gamedude-player.html'));

cpSync(join(root, 'public'), join(siteRoot, 'public'), { recursive: true });
copyButterchurnIntoPagesPublic();

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
  butterchurn: Object.fromEntries(
    BUTTERCHURN_FILES.map((name) => {
      const path = join(siteRoot, 'public', 'vendor', 'butterchurn', name);
      return [name, statSync(path).size];
    }),
  ),
  presetCount: readdirSync(join(siteRoot, 'public', 'vendor', 'butterchurn', 'presets')).filter((name) =>
    name.endsWith('.json'),
  ).length,
};
writeFileSync(
  join(siteRoot, 'public', 'vendor', 'butterchurn', 'pages-manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`GitHub Pages site written to ${siteRoot}`);
for (const [name, bytes] of Object.entries(manifest.butterchurn)) {
  console.log(`  butterchurn/${name}: ${(bytes / 1024).toFixed(1)} KiB`);
}
console.log(`  butterchurn/presets: ${manifest.presetCount} files`);
