import './components/GameDudeMenuScreen.js';
import '../vendor/gameboycss/components/GameboyConsole.js';
import { ButterchurnController } from './visualizer/ButterchurnController.js';

const KEY_MAP = {
  ArrowUp: { action: 'dpad', direction: 'up' },
  ArrowDown: { action: 'dpad', direction: 'down' },
  ArrowLeft: { action: 'dpad', direction: 'left' },
  ArrowRight: { action: 'dpad', direction: 'right' },
  z: { action: 'a' },
  Z: { action: 'a' },
  x: { action: 'b' },
  X: { action: 'b' },
  Enter: { action: 'start' },
  ' ': { action: 'start' },
  Backspace: { action: 'b' },
  s: { action: 'select' },
  S: { action: 'select' },
};

function getMenuCatalog() {
  const gb = document.querySelector('gameboy-console');
  return gb?.shadowRoot?.querySelector('game-dude-menu-screen')?.catalog ?? null;
}

function initVisualizer() {
  const hostEl = document.getElementById('viz-host');
  const controlsEl = document.getElementById('viz-controls');
  if (!hostEl || !controlsEl) return;

  const viz = new ButterchurnController(hostEl, controlsEl);

  const attachCatalog = () => {
    const catalog = getMenuCatalog();
    if (!catalog) {
      requestAnimationFrame(attachCatalog);
      return;
    }

    const syncVizWithPlayback = () => {
      const shouldRun = !!catalog.isPlaying?.() && viz.isEnabled;
      viz.setAudioActive(shouldRun);
    };

    viz.onEnabledChange = () => {
      syncVizWithPlayback();
    };

    const prevOnPlayStateChange = catalog.onPlayStateChange;
    catalog.onPlayStateChange = (playing) => {
      viz.setAudioActive(playing && viz.isEnabled);
      prevOnPlayStateChange?.(playing);
    };

    syncVizWithPlayback();
  };

  attachCatalog();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisualizer);
} else {
  initVisualizer();
}

document.addEventListener('keydown', (e) => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();
  const gb = document.querySelector('gameboy-console');
  if (!gb?.isOn) return;
  gb._forwardInput(mapped);
});
