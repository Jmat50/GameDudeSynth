#!/usr/bin/env node
/**
 * Bundle butterchurn IIFE + copy curated preset JSONs into public/vendor/butterchurn/.
 */
import { build } from 'esbuild';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'scripts', 'butterchurn-preset-catalog.json');
const vendorDir = join(root, 'public', 'vendor', 'butterchurn');
const presetsOutDir = join(vendorDir, 'presets');
const presetsSrcDir = join(root, 'node_modules', 'butterchurn-presets', 'presets', 'converted');
const imageDataDir = join(root, 'node_modules', 'butterchurn-presets', 'imageData');

function slugify(key) {
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 8);
  const safe = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${safe || 'preset'}-${hash}`;
}

function listPresetKeys() {
  if (!existsSync(presetsSrcDir)) {
    throw new Error(`Missing ${presetsSrcDir} — run npm install first`);
  }
  return new Set(
    readdirSync(presetsSrcDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -'.json'.length)),
  );
}

function readPackageVersion(pkgName) {
  const pkgPath = join(root, 'node_modules', pkgName, 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

function collectImageRefs(presetJson) {
  const refs = new Set();
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'tex' && typeof child === 'string' && child.trim()) {
        refs.add(child.trim());
      }
      walk(child);
    }
  };
  walk(presetJson);
  return [...refs];
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
if (!Array.isArray(catalog) || catalog.length !== 40) {
  throw new Error(`Expected 40 catalog entries in ${catalogPath}, got ${catalog?.length ?? 0}`);
}

const availableKeys = listPresetKeys();
const missing = catalog.filter((entry) => !availableKeys.has(entry.key));
if (missing.length) {
  const names = missing.map((entry) => entry.key).join('\n  - ');
  throw new Error(`Catalog keys missing from butterchurn-presets:\n  - ${names}`);
}

rmSync(presetsOutDir, { recursive: true, force: true });
mkdirSync(presetsOutDir, { recursive: true });
mkdirSync(join(vendorDir, 'imageData'), { recursive: true });

const imageRefs = new Set();
const runtimeCatalog = catalog.map((entry, index) => {
  const srcPath = join(presetsSrcDir, `${entry.key}.json`);
  const slug = slugify(entry.key);
  const fileName = `${slug}.json`;
  const destPath = join(presetsOutDir, fileName);
  copyFileSync(srcPath, destPath);

  const presetJson = JSON.parse(readFileSync(srcPath, 'utf8'));
  for (const ref of collectImageRefs(presetJson)) {
    imageRefs.add(ref);
  }

  return {
    index,
    vibe: entry.vibe,
    key: entry.key,
    displayName: entry.key,
    description: entry.description ?? '',
    url: `./presets/${fileName}`,
    slug,
  };
});

let copiedImages = 0;
for (const ref of imageRefs) {
  const src = join(imageDataDir, ref);
  const dest = join(vendorDir, 'imageData', ref);
  if (!existsSync(src)) {
    console.warn(`Warning: preset references missing image ${ref}`);
    continue;
  }
  copyFileSync(src, dest);
  copiedImages += 1;
}

writeFileSync(join(vendorDir, 'preset-catalog.json'), JSON.stringify(runtimeCatalog, null, 2));
writeFileSync(
  join(vendorDir, 'imageData', 'manifest.json'),
  JSON.stringify([...imageRefs].sort(), null, 2),
);

await build({
  entryPoints: [join(root, 'scripts', 'butterchurn-iife-entry.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'butterchurn',
  outfile: join(vendorDir, 'butterchurn.iife.js'),
  platform: 'browser',
  target: ['es2020'],
  minify: true,
});

const butterVersion = readPackageVersion('butterchurn');
const presetsVersion = readPackageVersion('butterchurn-presets');

writeFileSync(
  join(vendorDir, 'README.md'),
  `# butterchurn (GameDudeSynth)

- butterchurn: v${butterVersion}
- butterchurn-presets: v${presetsVersion}
- Curated presets: ${runtimeCatalog.length}
- Image assets: ${copiedImages}

## License

- [butterchurn](https://github.com/jberg/butterchurn) (MIT)
- [butterchurn-presets](https://github.com/jberg/butterchurn-presets) (MIT)

Rebuild:

\`\`\`bash
npm run build:butterchurn
\`\`\`
`,
);

console.log(`Wrote ${join(vendorDir, 'butterchurn.iife.js')}`);
console.log(`Wrote ${runtimeCatalog.length} presets to ${presetsOutDir}`);
console.log(`Copied ${copiedImages} image assets`);
