/**
 * Scan public/demos/*.wav and write manifest.json for static hosting.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demosDir = join(root, 'public', 'demos');

function humanize(stem) {
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const files = readdirSync(demosDir)
  .filter((f) => f.toLowerCase().endsWith('.wav'))
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const tracks = files.map((name) => {
  const stem = name.replace(/\.wav$/i, '');
  return {
    id: stem,
    title: humanize(stem) || stem,
    url: `./public/demos/${name}`,
  };
});

const out = join(demosDir, 'manifest.json');
writeFileSync(out, `${JSON.stringify({ tracks }, null, 2)}\n`, 'utf8');
console.log(`Wrote ${tracks.length} track(s) to ${out}`);
