/**
 * Fail fast if butterchurn vendor artifacts are missing (required for GitHub Pages + local demo).
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'public', 'vendor', 'butterchurn');

const required = [
  { name: 'butterchurn.iife.js', minBytes: 100_000 },
  { name: 'preset-catalog.json', minBytes: 500 },
];

let failed = false;

for (const { name, minBytes } of required) {
  const path = join(vendorDir, name);
  if (!existsSync(path)) {
    console.error(`Missing: ${path}`);
    failed = true;
    continue;
  }
  const size = statSync(path).size;
  if (size < minBytes) {
    console.error(`Too small (${size} bytes): ${path}`);
    failed = true;
    continue;
  }
  console.log(`OK ${name} (${(size / 1024).toFixed(1)} KiB)`);
}

const presetsDir = join(vendorDir, 'presets');
const presetCount = existsSync(presetsDir)
  ? readdirSync(presetsDir).filter((name) => name.endsWith('.json')).length
  : 0;
if (presetCount < 40) {
  console.error(`Expected at least 40 preset JSON files in ${presetsDir}, found ${presetCount}`);
  failed = true;
} else {
  console.log(`OK presets/ (${presetCount} files)`);
}

if (failed) {
  console.error(`
butterchurn vendor bundle is incomplete.

Build it:
  npm run build:butterchurn

Then commit public/vendor/butterchurn/ before deploying GitHub Pages.
`);
  process.exit(1);
}
