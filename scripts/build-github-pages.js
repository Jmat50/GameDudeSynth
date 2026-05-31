/**
 * Assemble a static site for GitHub Pages (jmat50.github.io).
 * Run after build:all and demos:manifest.
 */
import { cpSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'github-pages');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

copyFileSync(join(root, 'main-v2-export.html'), join(out, 'index.html'));
copyFileSync(join(root, 'main-v2-export.html'), join(out, 'main-v2-export.html'));
copyFileSync(join(root, 'gamedude-player.html'), join(out, 'gamedude-player.html'));

cpSync(join(root, 'public'), join(out, 'public'), { recursive: true });
cpSync(join(root, 'src-player'), join(out, 'src-player'), { recursive: true });
cpSync(
  join(root, 'vendor', 'gameboycss', 'assets'),
  join(out, 'vendor', 'gameboycss', 'assets'),
  { recursive: true },
);

mkdirSync(join(out, 'demos'), { recursive: true });
copyFileSync(
  join(out, 'public', 'demos', 'manifest.json'),
  join(out, 'demos', 'manifest.json'),
);

const readme = `# GameDudeSynth live demo

This site is auto-deployed from [GameDudeSynth](https://github.com/Jmat50/GameDudeSynth).
Do not edit files here directly — push changes to the source repo instead.

- **Export:** https://jmat50.github.io/
- **WAV player:** https://jmat50.github.io/gamedude-player.html
`;
writeFileSync(join(out, 'README.md'), readme, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');

console.log(`GitHub Pages site written to ${out}`);
