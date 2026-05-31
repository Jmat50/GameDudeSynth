import './components/GameDudeMenuScreen.js';
import '../vendor/gameboycss/components/GameboyConsole.js';
import { BackgroundController } from './backgrounds/BackgroundController.js';
import { AudioAnalyser } from './audio/AudioAnalyser.js';

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

function initBackgroundFx() {
  const bgLayer = document.getElementById('retro-bg-layer');
  const canvasEl = document.getElementById('retro-bg-canvas');
  const controlsEl = document.getElementById('bg-fx-controls');
  if (!bgLayer || !canvasEl || !controlsEl) return;

  const bgController = new BackgroundController(bgLayer, canvasEl, controlsEl);
  const analyser = new AudioAnalyser();
  analyser.onFrame = (metrics) => bgController.applyAudioMetrics(metrics);

  const attachCatalog = () => {
    const catalog = getMenuCatalog();
    if (!catalog) {
      requestAnimationFrame(attachCatalog);
      return;
    }

    catalog.analyser = analyser;
    catalog.onPlayStateChange = (playing) => {
      bgController.setAudioReactive(playing);
    };
  };

  attachCatalog();
}

document.addEventListener('DOMContentLoaded', initBackgroundFx);

document.addEventListener('keydown', (e) => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();
  const gb = document.querySelector('gameboy-console');
  if (!gb?.isOn) return;
  gb._forwardInput(mapped);
});
