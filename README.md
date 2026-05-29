# WarioSynth

Turn MIDI files into **Game Boy–style audio** and export WAV offline.

WarioSynth is a standalone chiptune synthesis tool built around an 8-channel “Super Game Boy” engine (`src-v2/`): four pulse channels, two wave channels, and two noise channels. It analyzes MIDI tracks, assigns roles (lead, bass, drums, harmony), and renders through authentic-style oscillators and LFSR noise—no samples, no cloud backend.

This repo is **not** the MOTIF search-and-play web app. There is no MIDI search API, embed widget, or server-side fetch layer here—only local file in, WAV out.

## Quick start (Windows)

1. Install [Node.js](https://nodejs.org/) and Python 3.
2. From the project folder:

```bash
npm install
```

3. Start the local server GUI:

- Double-click **`start_server_gui.bat`**, or  
- Run **`WarioSynthServer.exe`** (after `build_server_gui.bat`), or  
- Run `python server_gui.py`

4. Click **Start Server** → **Open in Browser**.
5. Open **`http://127.0.0.1:3000/main-v2-export.html`**
6. Drop a `.mid` file, review track assignments, **Render WAV**, **Export WAV**.

Hard-refresh the browser (`Ctrl+Shift+R`) after rebuilding the engine bundle.

## Project layout

| Path | Purpose |
|------|---------|
| `main-v2-export.html` | Export UI (drag/drop MIDI, track review, WAV export) |
| `public/gameboy-player.iife.js` | Browser bundle (`WarioSynthV2.GameBoyPlayer`) |
| `src-v2/` | Synthesis engine source (APU, MIDI mapping, offline render) |
| `server_gui.py` | Local static HTTP server for the export page |
| `scripts/process-local-midi-v2.ts` | CLI: MIDI → WAV (headless, no browser) |

## npm scripts

```bash
npm run typecheck          # TypeScript check (src-v2 + scripts)
npm run build:bundle       # Rebuild public/gameboy-player.iife.js from src-v2
npm run process:midi -- "path/to/song.mid"   # CLI offline render → output/
npm run test:track-analysis                  # Track role / drum routing regression checks
```

## Build the Windows server GUI (.exe)

```bat
build_server_gui.bat
```

Produces `dist/WarioSynthServer.exe` and copies it to the project root. Run the exe from this folder (same directory as `main-v2-export.html` and `public/`).

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

MIT
