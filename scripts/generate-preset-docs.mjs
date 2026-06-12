#!/usr/bin/env node
/**
 * Regenerate docs/PRESETS.md from public/vendor/butterchurn/preset-catalog.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeCatalogPath = join(root, 'public', 'vendor', 'butterchurn', 'preset-catalog.json');
const metaPath = join(root, 'public', 'vendor', 'butterchurn', 'preset-catalog-meta.json');
const outPath = join(root, 'docs', 'PRESETS.md');

if (!existsSync(runtimeCatalogPath)) {
  console.error(`Missing ${runtimeCatalogPath} — run npm run build:butterchurn first`);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(runtimeCatalogPath, 'utf8'));
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;

const verifyPath = join(root, '.build', 'preset-verify.json');
/** @type {Map<string, boolean> | null} */
let verifyBySlug = null;
if (existsSync(verifyPath)) {
  const report = JSON.parse(readFileSync(verifyPath, 'utf8'));
  verifyBySlug = new Map((report.results ?? []).map((r) => [r.slug, Boolean(r.works)]));
}

const packOrder = meta?.packs?.map((pack) => pack.id) ?? [
  'base',
  'extra',
  'image',
  'minimal',
  'nonMinimal',
  'md1',
  'other',
];

const packLabels = Object.fromEntries((meta?.packs ?? []).map((pack) => [pack.id, pack.label]));

function worksColumn(slug) {
  if (!verifyBySlug) return 'verify in browser';
  if (!verifyBySlug.has(slug)) return 'not sampled';
  return verifyBySlug.get(slug) ? 'yes' : 'no';
}

const sections = packOrder.map((packId) => {
  const label = packLabels[packId] ?? packId;
  const rows = catalog
    .filter((entry) => entry.packs?.includes(packId))
    .sort((a, b) => a.key.localeCompare(b.key));

  const tableRows = rows
    .map(
      (entry) =>
        `| ${entry.index} | \`${entry.slug}\` | ${entry.key} | ${entry.vibe || '—'} | ${entry.description || '—'} | ${worksColumn(entry.slug)} |`,
    )
    .join('\n');

  return `### ${label} (${rows.length})

| # | Slug | butterchurn key | Vibe (curated) | Notes | Works in browser |
|---|------|-----------------|----------------|-------|------------------|
${tableRows}`;
});

const md = `# Bundled butterchurn presets

GameDudeSynth ships **${catalog.length}** presets from [butterchurn-presets](https://github.com/jberg/butterchurn-presets), staged into \`public/vendor/butterchurn/presets/\`.

Use the **Pack** and **Preset** dropdowns on the player page to choose a Milkdrop visual. Presets are grouped by upstream pack metadata (\`base\`, \`extra\`, \`image\`, \`minimal\`, \`nonMinimal\`, \`md1\`, \`other\`).

See [VISUALIZER.md](./VISUALIZER.md) for what the controls mean.

${sections.join('\n\n')}

## Regenerating this table

\`\`\`bash
npm run build:butterchurn
npm run verify:presets -- --sample=30
npm run presets:docs
\`\`\`
`;

writeFileSync(outPath, md, 'utf8');
console.log(`Wrote ${outPath} (${catalog.length} presets)`);
