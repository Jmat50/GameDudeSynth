#!/usr/bin/env node
/**
 * Regenerate docs/PRESETS.md from scripts/projectm-preset-manifest.txt
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'scripts', 'projectm-preset-manifest.txt');
const outPath = join(root, 'docs', 'PRESETS.md');

function categoryFromPath(rel) {
  const top = rel.split('/')[0] ?? 'Unknown';
  const sub = rel.split('/')[1] ?? '';
  return sub ? `${top} / ${sub}` : top;
}

function describeLook(top) {
  const hints = {
    Dancer: 'Figure and motion trails; dance-like shapes.',
    Drawing: 'Painted strokes, ink, and flowing lines.',
    Fractal: 'Recursive spirals, nested shapes, and fractal zooms.',
    Geometric: 'Grids, tunnels, wireframes, and symmetric forms.',
    Hypnotic: 'Polar warps, illusions, and slow hypnotic motion.',
    Particles: 'Points, orbits, and particle fields (includes one Royal mashup baseline).',
    Reaction: 'Fluid blobs, ripples, and reactive liquid motion.',
    Sparkle: 'Bursts, jewels, and glittery highlights.',
    Supernova: 'Radial bursts, stars, and radiant flares.',
    Waveform: 'Spectrum bars, wire tangents, and classic waveform shapes.',
  };
  return hints[top] ?? 'Milkdrop visual preset from the cream-of-the-crop pack.';
}

const lines = readFileSync(manifestPath, 'utf8').split(/\r?\n/);
const entries = lines
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const verifyPath = join(root, '.build', 'preset-verify.json');
/** @type {Map<number, boolean> | null} */
let verifyByIndex = null;
if (existsSync(verifyPath)) {
  const report = JSON.parse(readFileSync(verifyPath, 'utf8'));
  verifyByIndex = new Map(
    (report.results ?? []).map((r) => [r.index, Boolean(r.works)]),
  );
}

const rows = entries.map((rel, index) => {
  const top = rel.split('/')[0];
  const original = basename(rel);
  const staged = `preset_${String(index).padStart(3, '0')}_${original}`;
  return {
    index,
    staged,
    original,
    category: categoryFromPath(rel),
    look: describeLook(top),
    works: verifyByIndex?.has(index)
      ? verifyByIndex.get(index)
        ? 'yes'
        : 'no'
      : 'verify in browser',
  };
});

const md = `# Bundled Milkdrop presets

GameDudeSynth ships **${entries.length}** curated presets from [presets-cream-of-the-crop](https://github.com/projectM-visualizer/presets-cream-of-the-crop), staged into \`public/vendor/projectm/projectm.data\`.

Use **◀ Preset / Preset ▶** on the player page to cycle. Index **0** is the first preset after enabling Viz.

See [VISUALIZER.md](./VISUALIZER.md) for what the controls mean.

## Catalog

| # | Staged file | Original name | Category | Intended look | Works in browser |
|---|-------------|---------------|----------|---------------|------------------|
${rows
  .map(
    (r) =>
      `| ${r.index} | \`${r.staged}\` | ${r.original} | ${r.category} | ${r.look} | ${r.works} |`,
  )
  .join('\n')}

## Regenerating this table

\`\`\`bash
node scripts/generate-preset-docs.mjs
\`\`\`

After changing [\`scripts/projectm-preset-manifest.txt\`](../scripts/projectm-preset-manifest.txt), rebuild WASM:

\`\`\`powershell
.\\scripts\\build-projectm-wasm.ps1 -SkipEmsdkInstall
\`\`\`

Then cycle presets on \`gamedude-player.html\` and update the **Works in browser** column above.
`;

writeFileSync(outPath, md, 'utf8');
console.log(`Wrote ${outPath} (${entries.length} presets)`);
