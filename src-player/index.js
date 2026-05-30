import './components/GameDudeMenuScreen.js';
import '../vendor/gameboycss/components/GameboyConsole.js';

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

document.addEventListener('keydown', (e) => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();
  const gb = document.querySelector('gameboy-console');
  if (!gb?.isOn) return;
  gb._forwardInput(mapped);
});
