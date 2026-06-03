# Background visualizer (projectM)

The WAV player page (`gamedude-player.html`) can show a full-screen **Milkdrop-style** background behind the Game Boy UI. This is powered by [projectM](https://github.com/projectM-visualizer/projectm) compiled to WebAssembly.

## Controls (top-right)

These are **not** MIDI export settings and not per-track audio settings.

| Control | What it does |
|---------|--------------|
| **Viz** | Turns the background visualizer on or off. |
| **Vibe** | Chooses a visual style and randomly loads one bundled Milkdrop shader from that style. |
| **Dim** | Sets how strong the background appears (opacity over the page). Lower = more subtle. |

Vibes still **react to the music** while playing (beat, level, spectrum). Selecting a new **Vibe** picks a random bundled visual from that category; there are no previous/next preset controls.

## Verifying loaded Vibes

1. Open the player over HTTP (local server or GitHub Pages), not `file://`.
2. Enable **Viz** and choose entries from the **Vibe** dropdown.
3. Run `npm run verify:presets` for a headless browser check that each Vibe produces non-flat canvas output.

The full bundled catalog with categories is in [PRESETS.md](./PRESETS.md).

## Building / updating presets

Presets are curated in [`scripts/projectm-preset-manifest.txt`](../scripts/projectm-preset-manifest.txt), mirrored to `public/vendor/projectm/bundled-presets.json` for the Vibe dropdown, and baked into `public/vendor/projectm/projectm.data` when you run:

```powershell
.\scripts\build-projectm-wasm.ps1
```

See [README.md](../README.md) - External Project Credits.
