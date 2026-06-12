#!/usr/bin/env node
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCatalog } from './generate-butterchurn-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'public', 'vendor', 'butterchurn');
const presetsOutDir = join(vendorDir, 'presets');
const presetsSrcDir = join(root, 'node_modules', 'butterchurn-presets', 'presets', 'converted');
const imageDataDir = join(root, 'node_modules', 'butterchurn-presets', 'imageData');

function readPackageVersion(pkgName) {
  const pkgPath = join(root, 'node_modules', pkgName, 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

const { entries, meta, warnings } = generateCatalog();
for (const message of warnings) {
  console.warn(`Warning: ${message}`);
}

if (!entries.length) {
  throw new Error('Generated catalog is empty');
}

rmSync(presetsOutDir, { recursive: true, force: true });
mkdirSync(presetsOutDir, { recursive: true });
mkdirSync(join(vendorDir, 'imageData'), { recursive: true });

const imageRefs = new Set();
const runtimeCatalog = entries.map((entry) => {
  const srcPath = join(presetsSrcDir, `${entry.key}.json`);
  const destPath = join(presetsOutDir, `${entry.slug}.json`);
  copyFileSync(srcPath, destPath);

  for (const ref of entry.images) {
    imageRefs.add(ref);
  }

  return {
    index: entry.index,
    key: entry.key,
    slug: entry.slug,
    url: entry.url,
    packs: entry.packs,
    vibe: entry.vibe,
    description: entry.description,
    images: entry.images,
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
writeFileSync(join(vendorDir, 'preset-catalog-meta.json'), JSON.stringify(meta, null, 2));
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
- Bundled presets: ${runtimeCatalog.length}
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
