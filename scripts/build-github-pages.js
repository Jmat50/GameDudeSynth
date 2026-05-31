/**
 * Assemble GameDudeSynth under /GameDudeSynth/ for jmat50.github.io.
 * Run after build:all and demos:manifest.
 */
import { cpSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'github-pages');
const siteRoot = join(out, 'GameDudeSynth');

rmSync(out, { recursive: true, force: true });
mkdirSync(siteRoot, { recursive: true });

copyFileSync(join(root, 'engine.html'), join(siteRoot, 'engine.html'));
copyFileSync(join(root, 'gamedude-player.html'), join(siteRoot, 'gamedude-player.html'));

cpSync(join(root, 'public'), join(siteRoot, 'public'), { recursive: true });
cpSync(join(root, 'src-player'), join(siteRoot, 'src-player'), { recursive: true });
cpSync(
  join(root, 'vendor', 'gameboycss', 'assets'),
  join(siteRoot, 'vendor', 'gameboycss', 'assets'),
  { recursive: true },
);

mkdirSync(join(siteRoot, 'demos'), { recursive: true });
copyFileSync(
  join(siteRoot, 'public', 'demos', 'manifest.json'),
  join(siteRoot, 'demos', 'manifest.json'),
);

const readme = `# GameDudeSynth live demo

Auto-deployed from [GameDudeSynth](https://github.com/Jmat50/GameDudeSynth).
Do not edit here — push changes to the source repo instead.

- **MIDI export:** https://jmat50.github.io/GameDudeSynth/engine.html
- **WAV player:** https://jmat50.github.io/GameDudeSynth/gamedude-player.html
`;
writeFileSync(join(siteRoot, 'README.md'), readme, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');

console.log(`GitHub Pages site written to ${siteRoot}`);
