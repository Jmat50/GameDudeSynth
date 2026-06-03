/**
 * Fail fast if projectM WASM artifacts are missing (required for GitHub Pages + local demo).
 */
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(root, 'public', 'vendor', 'projectm');

const required = [
  { name: 'projectm.js', minBytes: 50_000 },
  { name: 'projectm.wasm', minBytes: 500_000 },
  { name: 'projectm.data', minBytes: 1_000_000 },
  { name: 'bundled-presets.json', minBytes: 500 },
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
  console.log(`OK ${name} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
}

if (failed) {
  console.error(`
projectM vendor bundle is incomplete.

Build it once (Windows):
  .\\scripts\\build-projectm-wasm.ps1

Then commit public/vendor/projectm/ before deploying GitHub Pages.
`);
  process.exit(1);
}
