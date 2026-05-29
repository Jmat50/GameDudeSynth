# GameDudeSynth — Agent Notes

This repository is **GameDudeSynth**, a local Game Boy MIDI synthesis and WAV export tool.

## Primary user workflow

1. User runs the local server (`server_gui.py`, `start_server_gui.bat`, or `GameDudeSynthServer.exe`).
2. User opens `main-v2-export.html` over HTTP (not `file://`).
3. User loads a local `.mid` file, optionally adjusts the **track assignment** table, renders offline, exports WAV.

## Core code (do not confuse with removed legacy)

| Area | Location |
|------|----------|
| Engine entry | `src-v2/core/GameBoyPlayer.ts` |
| MIDI analysis | `src-v2/audio/midi/TrackAnalyzer.ts`, `RoleAllocator.ts`, `ChannelMapper.ts` |
| APU | `src-v2/audio/apu/` |
| Export UI | `main-v2-export.html` |
| Browser bundle | `public/gameboy-player.iife.js` (build with `npm run build:bundle`) |
| Local server | `server_gui.py` |

**Removed / out of scope:** legacy v1 synthesis tree, MIDI search/fetch API, hosted search UI pages.

## Engine pipeline

```
MIDI file → convertMIDITracks (per-channel split)
         → TrackAnalyzer (role confidence)
         → RoleAllocator (quotas, lead election, noise gate)
         → ChannelMapper (p1–n2)
         → convertToGBNotes (+ drumHit on noise)
         → GameBoyAPU.scheduleNote → OfflineAudioContext → WAV
```

## Local dev commands

```bash
npm install
npm run typecheck
npm run build:bundle          # after any src-v2 change used by the export page
npm run test:track-analysis
npm run process:midi -- "file.mid"
python server_gui.py          # or start_server_gui.bat
```

## Guidelines for changes

- **Bias toward the export path:** `main-v2-export.html` + IIFE bundle + `GameBoyPlayer.renderOffline()`.
- **Rebuild the bundle** after engine changes: `npm run build:bundle`.
- **Strict noise routing:** Only true drum tracks → `n1`/`n2`; use `playKick`/`playSnare`/`playHihat` when possible.
- **Track review UI:** Show all MIDI parts; user overrides via `TrackOverride[]` passed to `renderOffline()`.
- **Incremental diffs:** Prefer small changes in `src-v2/` over new infra.
- **No new backend** unless explicitly requested—static server only.

## Windows GUI server

- `server_gui.py` — Tkinter start/stop, serves repo root, `/` → `main-v2-export.html`.
- `_resolve_serve_root()` walks up from `dist/` exe to find the project root.
- `build_server_gui.bat` — PyInstaller → `GameDudeSynthServer.exe` in project root.

## Definition of done (typical task)

- `npm run typecheck` passes.
- `npm run test:track-analysis` passes when touching analysis/mapping.
- Export page loads via local server, MIDI renders, WAV exports.
- `npm run build:bundle` run if `src-v2` changed and browser behavior is affected.
