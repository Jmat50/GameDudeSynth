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

function getMenuScreen() {
  const gb = document.querySelector('gameboy-console');
  return gb?.shadowRoot?.querySelector('game-dude-menu-screen') ?? null;
}

function initVisualizer() {
  const hostEl = document.getElementById('viz-host');
  const controlsEl = document.getElementById('viz-controls');
  if (!hostEl || !controlsEl) return;

  const viz = new ButterchurnController(hostEl, controlsEl);

  const syncVizWithPlayback = async () => {
    const screen = getMenuScreen();
    if (!screen) return;

    const midiActive =
      screen.playbackMode === 'midi' &&
      screen.midiPlayer?.isActive?.() &&
      !screen.midiPlayer?.isPaused?.();
    const wavPlaying = screen.catalog?.isPlaying?.();

    try {
      if (midiActive) {
        const ctx = screen.midiPlayer.getAudioContext();
        const out = screen.midiPlayer.getOutputNode();
        if (ctx && out) {
          await viz.attachAudioSource(ctx, out);
        }
      } else if (wavPlaying || screen.playbackMode === 'wav') {
        await viz.attachHowlerAudio();
      }
    } catch (err) {
      console.warn('[viz] audio source attach failed', err);
    }

    const shouldRun = !!(midiActive || wavPlaying) && viz.isEnabled;
    viz.setAudioActive(shouldRun);
  };

  const attachPlaybackHooks = () => {
    const screen = getMenuScreen();
    if (!screen?.catalog || !screen?.midiPlayer) {
      requestAnimationFrame(attachPlaybackHooks);
      return;
    }

    viz.onEnabledChange = () => {
      syncVizWithPlayback();
    };

    const wrapPlayState = (target) => {
      const prev = target.onPlayStateChange;
      target.onPlayStateChange = (playing) => {
        syncVizWithPlayback();
        prev?.(playing);
      };
    };

    wrapPlayState(screen.catalog);
    wrapPlayState(screen.midiPlayer);
    syncVizWithPlayback();
  };

  attachPlaybackHooks();
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
