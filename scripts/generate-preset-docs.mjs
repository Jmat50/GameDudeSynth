#!/usr/bin/env node
/**
 * Regenerate docs/PRESETS.md from scripts/butterchurn-preset-catalog.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'scripts', 'butterchurn-preset-catalog.json');
const runtimeCatalogPath = join(root, 'public', 'vendor', 'butterchurn', 'preset-catalog.json');
const outPath = join(root, 'docs', 'PRESETS.md');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
/** @type {Map<number, string> | null} */
let slugByIndex = null;
if (existsSync(runtimeCatalogPath)) {
  const runtime = JSON.parse(readFileSync(runtimeCatalogPath, 'utf8'));
  slugByIndex = new Map(runtime.map((entry) => [entry.index, entry.slug]));
}

const verifyPath = join(root, '.build', 'vibe-verify.json');
/** @type {Map<string, boolean> | null} */
let verifyByVibe = null;
if (existsSync(verifyPath)) {
  const report = JSON.parse(readFileSync(verifyPath, 'utf8'));
  verifyByVibe = new Map((report.results ?? []).map((r) => [r.vibe, Boolean(r.works)]));
}

const rows = catalog.map((entry, index) => ({
  index,
  slug: slugByIndex?.get(index) ?? '(build vendor first)',
  key: entry.key,
  vibe: entry.vibe,
  look: entry.description ?? '',
  works: verifyByVibe?.has(entry.vibe)
    ? verifyByVibe.get(entry.vibe)
      ? 'yes'
      : 'no'
    : 'verify in browser',
}));

const md = `# Bundled butterchurn presets

GameDudeSynth ships **${catalog.length}** curated presets from [butterchurn-presets](https://github.com/jberg/butterchurn-presets), staged into \`public/vendor/butterchurn/presets/\`.

Use the **Vibe** dropdown on the player page to choose a visual style. Each selection randomly loads one bundled preset from that Vibe.

See [VISUALIZER.md](./VISUALIZER.md) for what the controls mean.

## Catalog

| # | Slug | butterchurn key | Vibe | Intended look | Works in browser |
|---|------|-----------------|------|---------------|------------------|
${rows
  .map(
    (r) =>
      `| ${r.index} | \`${r.slug}\` | ${r.key} | ${r.vibe} | ${r.look} | ${r.works} |`,
  )
  .join('\n')}

## Regenerating this table

\`\`\`bash
npm run build:butterchurn
npm run presets:docs
\`\`\`

After changing [\`scripts/butterchurn-preset-catalog.json\`](../scripts/butterchurn-preset-catalog.json), rebuild the vendor bundle and run \`npm run verify:presets\`.
`;

writeFileSync(outPath, md, 'utf8');
console.log(`Wrote ${outPath} (${catalog.length} presets)`);
