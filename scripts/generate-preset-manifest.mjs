#!/usr/bin/env node
// Walk public/vendor/projectm/presets and write manifest.json with relative paths (posix)
import { promises as fs } from 'fs';
import { join, relative, sep, posix } from 'path';
const repoRoot = new URL('file://' + process.cwd() + '/').pathname;
const presetsRoot = join(process.cwd(), 'public', 'vendor', 'projectm', 'presets');
async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.milk')) {
      // compute path relative to presets root, using posix separators
      const rel = posix.join(...relative(presetsRoot, p).split(sep));
      out.push(rel);
    }
  }
  return out;
}

async function main() {
  try {
    const files = await walk(presetsRoot);
    files.sort();
    const outPath = join(presetsRoot, 'manifest.json');
    await fs.writeFile(outPath, JSON.stringify(files, null, 2), 'utf8');
    console.log(`Wrote ${outPath} (${files.length} presets)`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
