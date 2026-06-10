# Background visualizer (butterchurn)

The WAV player page (`gamedude-player.html`) can show a full-screen **Milkdrop-style** background behind the Game Boy UI. This is powered by [butterchurn](https://github.com/jberg/butterchurn) (pure JavaScript + WebGL2).

## Controls (top-right)

These are **not** MIDI export settings and not per-track audio settings.

| Control | What it does |
|---------|--------------|
| **Viz** | Turns the background visualizer on or off. |
| **Vibe** | Chooses a visual style and randomly loads one bundled Milkdrop preset from that style. |
| **Dim** | Sets how strong the background appears (opacity over the page). Lower = more subtle. |

Vibes still **react to the music** while playing (beat, level, spectrum). Selecting a new **Vibe** picks a random bundled visual from that category; there are no previous/next preset controls.

## Verifying loaded Vibes

1. Open the player over HTTP (local server or GitHub Pages), not `file://`.
2. Enable **Viz** and choose entries from the **Vibe** dropdown.
3. Run `npm run verify:presets` for a headless browser check that each Vibe produces non-flat canvas output.

The full bundled catalog with categories is in [PRESETS.md](./PRESETS.md).

## Building / updating presets

Presets are curated in [`scripts/butterchurn-preset-catalog.json`](../scripts/butterchurn-preset-catalog.json). The build step copies JSON files into `public/vendor/butterchurn/presets/` and writes `preset-catalog.json` for the Vibe dropdown:

```bash
npm run build:butterchurn
```

See [README.md](../README.md) — External Project Credits.
