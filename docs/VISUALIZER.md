# Background visualizer (butterchurn)

The WAV player page (`gamedude-player.html`) can show a full-screen **Milkdrop-style** background behind the Game Boy UI. This is powered by [butterchurn](https://github.com/jberg/butterchurn) (pure JavaScript + WebGL2).

## Controls (top-right)

These are **not** MIDI export settings and not per-track audio settings.

| Control | What it does |
|---------|--------------|
| **Viz** | Turns the background visualizer on or off. |
| **Pack** | Chooses a preset category from upstream butterchurn-presets pack metadata (Base, Extra, Image, etc.). |
| **Preset** | Chooses a specific Milkdrop preset from the selected pack. |
| **Dim** | Sets how strong the background appears (opacity over the page). Lower = more subtle. |

Presets **react to the music** while playing (beat, level, spectrum). Your Pack and Preset choices are remembered in the browser.

## Verifying loaded presets

1. Open the player over HTTP (local server or GitHub Pages), not `file://`.
2. Enable **Viz**, pick a **Pack**, then choose a **Preset**.
3. Run `npm run verify:presets -- --sample=30` for a headless browser check on a stratified sample.

The full bundled catalog with categories is in [PRESETS.md](./PRESETS.md).

## Building / updating presets

Presets are copied from `butterchurn-presets` at build time. Optional vibe/description overrides for curated picks live in [`scripts/butterchurn-preset-catalog.json`](../scripts/butterchurn-preset-catalog.json). The build copies all converted JSON files into `public/vendor/butterchurn/presets/` and writes `preset-catalog.json` for the dropdowns:

```bash
npm run build:butterchurn
```

See [README.md](../README.md) — External Project Credits.
