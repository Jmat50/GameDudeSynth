# GameDudeSynth — Scope and Guidelines (for AI agents)

## What this project is

**GameDudeSynth** converts local MIDI files into Game Boy–style audio using an 8-channel Web Audio engine (`src-v2/`). The main deliverable is offline WAV export via `main-v2-export.html` and optional CLI (`npm run process:midi`).

Local-only: no in-repo MIDI search, fetch API, soundfont preview app, or cloud deploy stack.

## In scope

- MIDI parse, per-channel part split, role detection, channel mapping
- Offline render and WAV export (browser + CLI)
- Track assignment review / overrides in the export UI
- Local static server GUI (`server_gui.py`)
- Engine quality: pulse/wave/noise routing, monophony, drum hits on noise channels
- Regression script: `npm run test:track-analysis`

## Out of scope (unless explicitly requested)

- MIDI search, URL fetch, SSRF-protected backends, embed widgets
- Legacy v1 generation / similarity transforms
- Large refactors, new cloud infra, analytics

## Working conventions

- After `src-v2` changes consumed by the browser: `npm run build:bundle`.
- Test export flow through **HTTP** (`server_gui.py`), not `file://`.
- Keep degradation visible (logs, status text on export page).
- Prefer muting or user-assigned overflow over cross-family channel reuse (melody on noise).
- Definition of done: typecheck + track-analysis tests (when relevant) + demo load → render → export on a sample MIDI.

## Key files

- `src-v2/core/GameBoyPlayer.ts` — orchestration
- `src-v2/audio/midi/` — analysis, allocation, mapping
- `main-v2-export.html` — UI
- `public/gameboy-player.iife.js` — browser runtime
- `AGENTS.md` — local workflow details
