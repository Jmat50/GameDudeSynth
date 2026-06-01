# Background visualizer (projectM)

The WAV player page (`gamedude-player.html`) can show a full-screen **Milkdrop-style** background behind the Game Boy UI. This is powered by [projectM](https://github.com/projectM-visualizer/projectm) compiled to WebAssembly.

## Controls (top-right)

These are **not** MIDI export settings and not per-track audio settings.

| Control | What it does |
|---------|----------------|
| **Viz** | Turns the background visualizer on or off. |
| **◀ Preset / Preset ▶** | Cycles through bundled **Milkdrop preset** files (`.milk`). Each preset is a different audio-reactive visual shader. |
| **Dim** | Sets how strong the background appears (opacity over the page). Lower = more subtle. |

Presets still **react to the music** while playing (beat, level, spectrum). Only the **preset file** changes when you press the arrows—not separate “settings” inside a preset.

## Verifying loaded presets

1. Open the player over HTTP (local server or GitHub Pages), not `file://`.
2. Enable **Viz** and open the browser developer console.
3. Look for lines like:

```text
[projectM] presets loaded: 40, current=0
[projectM] preset[0]=/presets/preset_000_...
```

The full catalog with categories is in [PRESETS.md](./PRESETS.md).

## Building / updating presets

Presets are curated in [`scripts/projectm-preset-manifest.txt`](../scripts/projectm-preset-manifest.txt) and baked into `public/vendor/projectm/projectm.data` when you run:

```powershell
.\scripts\build-projectm-wasm.ps1
```

See [README.md](../README.md) — External Project Credits.
