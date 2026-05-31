# GameDudeSynth

Turn MIDI files into **Game Boy–style audio** and export WAV offline.

GameDudeSynth is a standalone chiptune synthesis tool built around an 8-channel “Super Game Boy” engine (`src-v2/`): four pulse channels, two wave channels, and two noise channels. It analyzes MIDI tracks, assigns roles (lead, bass, drums, harmony), and renders through authentic-style oscillators and LFSR noise—no samples, no cloud backend.

Local file in, WAV out only—no MIDI search API, embed widget, or server-side fetch layer.

## Quick start (Windows)

1. Install [Node.js](https://nodejs.org/) and Python 3.
2. From the project folder:

```bash
npm install
```

3. Start the local server GUI:

- Double-click **`start_server_gui.bat`**, or  
- Run **`GameDudeSynthServer.exe`** (after `build_server_gui.bat`), or  
- Run `python server_gui.py`

4. Click **Start Server** → **Open Export** (or **Open Player** for the WAV menu).
5. Export: **`http://127.0.0.1:3000/main-v2-export.html`** — drop a `.mid` file, review track assignments, **Render WAV**, **Export WAV**.
6. Player: **`http://127.0.0.1:3000/gamedude-player.html`** — drop `.wav` files in `public/demos/`, power on the console, use D-pad + A/START.

Hard-refresh the browser (`Ctrl+Shift+R`) after rebuilding bundles.

## WAV player (Game Boy UI)

- Page: `gamedude-player.html`
- Drop folder: `public/demos/` (any `.wav` file)
- Track list: `GET /demos/manifest.json` when using `server_gui.py` (auto-scans the folder)
- Static fallback: `npm run demos:manifest` writes `public/demos/manifest.json`
- Console shell vendored from [gameboycss](https://github.com/ManzDev/gameboycss) by ManzDev (ISC)

## Project layout

| Path | Purpose |
|------|---------|
| `main-v2-export.html` | Export UI (drag/drop MIDI, track review, WAV export) |
| `gamedude-player.html` | Game Boy shell WAV player (`public/demos/`) |
| `public/gameboy-player.iife.js` | Browser bundle (`GameDudeSynthV2.GameBoyPlayer`) |
| `public/gameboy-ui.iife.js` | WAV player UI bundle (Lit + Howler) |
| `vendor/gameboycss/` | Vendored gameboycss console shell (ISC, ManzDev) |
| `src-v2/` | Synthesis engine source (APU, MIDI mapping, offline render) |
| `src-player/` | WAV player menu screen + catalog |
| `public/demos/` | Drop folder for player WAV tracks |
| `server_gui.py` | Local static HTTP server + `/demos/manifest.json` |
| `scripts/process-local-midi-v2.ts` | CLI: MIDI → WAV (headless, no browser) |

## npm scripts

```bash
npm run typecheck          # TypeScript check (src-v2 + scripts)
npm run build:bundle       # Rebuild public/gameboy-player.iife.js from src-v2
npm run build:player-ui    # Rebuild public/gameboy-ui.iife.js (WAV player page)
npm run build:all          # Both bundles
npm run demos:manifest     # Regenerate public/demos/manifest.json from folder scan
npm run build:pages          # Assemble dist/github-pages for GitHub Pages deploy
npm run process:midi -- "path/to/song.mid"   # CLI offline render → output/
npm run test:track-analysis                  # Track role / drum routing regression checks
```

## Build the Windows server GUI (.exe)

```bat
build_server_gui.bat
```

Produces `dist/GameDudeSynthServer.exe` and copies it to the project root. Run the exe from this folder (same directory as `main-v2-export.html` and `public/`).

## Live demo (GitHub Pages)

The export UI and WAV player are published at **https://jmat50.github.io/** from the [`jmat50.github.io`](https://github.com/Jmat50/jmat50.github.io) repo. Pushes to `master` on this repo trigger an automatic deploy via `.github/workflows/deploy-github-pages.yml`.

### One-time setup

1. **GitHub Pages** on `jmat50.github.io` — already configured: branch `main`, folder `/` (root).
2. **Deploy token** — create a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) (or classic PAT) with **Contents: Read and write** on `Jmat50/jmat50.github.io`.
3. **Repository secret** — in [GameDudeSynth → Settings → Secrets](https://github.com/Jmat50/GameDudeSynth/settings/secrets/actions), add `PAGES_DEPLOY_TOKEN` with that token value.

After the secret is set, push to `master` (or run the workflow manually under Actions → “Deploy live demo to GitHub Pages”). The workflow builds bundles, refreshes the demo manifest, assembles `dist/github-pages/`, and pushes to `jmat50.github.io`.

Local dry run:

```bash
npm run build:all && npm run demos:manifest && npm run build:pages
```

## How it works

1. **Parse** — `@tonejs/midi` reads the file; multi-channel tracks are split into assignable parts.
2. **Analyze** — Per-part role scores (lead, bass, drums, harmony, pad, fx) using pitch, density, monophony, and track names.
3. **Allocate** — Global quotas (one lead, one bass, up to two drum tracks) and strict noise gating so melody is not sent to LFSR hiss.
4. **Map** — Parts map to engine channels `p1`–`p4`, `w1`–`w2`, `n1`–`n2`.
5. **Render** — `OfflineAudioContext` schedules notes; export page writes 16-bit WAV.

## Requirements

- Modern Chromium browser for the export page (File System Access API optional for save dialog).
- Do **not** rely on `file://` for the export page—use the local HTTP server.

## License

MIT. WAV player console shell includes components adapted from [gameboycss](https://github.com/ManzDev/gameboycss) (ISC, ManzDev) — see `vendor/gameboycss/README.md`.
