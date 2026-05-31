# Demo WAV drop folder

Place `.wav` files here. They appear in the Game Boy WAV player menu when served over HTTP.

- Dynamic list: `GET /demos/manifest.json` (when using `server_gui.py`)
- Static fallback: run `npm run demos:manifest` to refresh `manifest.json`

Open: `http://127.0.0.1:3000/gamedude-player.html`

Live demo: https://jmat50.github.io/GameDudeSynth/gamedude-player.html
