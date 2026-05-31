import './components/GameDudeMenuScreen.js';
import '../vendor/gameboycss/components/GameboyConsole.js';
import { ProjectMController } from './visualizer/ProjectMController.js';
import { ProjectMAudioTap } from './visualizer/ProjectMAudioTap.js';

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

function initProjectMVisualizer() {
  const hostEl = document.getElementById('projectm-host');
  const controlsEl = document.getElementById('viz-controls');
  if (!hostEl || !controlsEl) return;

  const viz = new ProjectMController(hostEl, controlsEl);
  const tap = new ProjectMAudioTap();
  viz.wireAudioTap(tap);

  const attachCatalog = () => {
    const catalog = getMenuCatalog();
    if (!catalog) {
      requestAnimationFrame(attachCatalog);
      return;
    }

    catalog.audioTap = tap;
    const prevOnPlayStateChange = catalog.onPlayStateChange;
    catalog.onPlayStateChange = (playing) => {
      viz.setAudioActive(playing && viz.isEnabled);
      if (playing && viz.isEnabled) {
        tap.start();
      } else {
        tap.stop();
      }
      prevOnPlayStateChange?.(playing);
    };
  };

  attachCatalog();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjectMVisualizer);
} else {
  initProjectMVisualizer();
}

document.addEventListener('keydown', (e) => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();
  const gb = document.querySelector('gameboy-console');
  if (!gb?.isOn) return;
  gb._forwardInput(mapped);
});
