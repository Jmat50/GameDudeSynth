import { ASSET_BASE } from '../netstalgiaThemes.js';

const DIAL_UP_MESSAGES = [
  'Initializing modem...',
  'Dialing Internet Service Provider...',
  'Handshaking with modem...',
  'Negotiating connection speed...',
  'Establishing PPP connection...',
  'Verifying username and password...',
  'Registering on network...',
  'Connection established successfully!',
];

const CONNECTION_SPEEDS = [
  { speed: '14.4 Kbps', multiplier: 2.5 },
  { speed: '28.8 Kbps', multiplier: 2.0 },
  { speed: '33.6 Kbps', multiplier: 1.5 },
  { speed: '56K V.90', multiplier: 1.0 },
  { speed: '56K V.92', multiplier: 0.8 },
];

function pickSpeed() {
  return CONNECTION_SPEEDS[Math.floor(Math.random() * CONNECTION_SPEEDS.length)];
}

export class DialUpScene {
  constructor() {
    this._container = null;
    this._progress = 0;
    this._step = 0;
    this._dialAttempt = 1;
    this._speed = pickSpeed();
    this._metrics = { rms: 0, bass: 0, mid: 0, treble: 0 };
    this._timer = null;
    this._blocks = [];
    this._progressEl = null;
    this._statusEl = null;
    this._attemptEl = null;
    this._speedEl = null;
  }

  start(container) {
    this.stop();
    this._container = container;
    this._speed = pickSpeed();
    this._progress = 0;
    this._step = 0;
    this._dialAttempt = 1;

    container.innerHTML = `
      <div class="loading-screen-container">
        <div class="loading-window">
          <div class="loading-titlebar">
            <span>Dialing Progress</span>
            <span>_ □ ×</span>
          </div>
          <div class="loading-content">
            <img class="loading-gif" src="${ASSET_BASE}/dialup.gif" alt="" width="280" height="120" />
            <div class="loading-progress-track"></div>
            <div class="loading-status"></div>
            <div class="loading-meta">
              <div class="loading-speed"></div>
              <div class="loading-attempt"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const track = container.querySelector('.loading-progress-track');
    this._blocks = Array.from({ length: 20 }, () => {
      const block = document.createElement('div');
      block.className = 'loading-progress-block';
      track.appendChild(block);
      return block;
    });

    this._progressEl = container.querySelector('.loading-status');
    this._attemptEl = container.querySelector('.loading-attempt');
    this._speedEl = container.querySelector('.loading-speed');
    this._speedEl.textContent = `Speed: ${this._speed.speed}`;
    this._updateUi();

    this._timer = setInterval(() => this._tick(), 50);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { rms: 0, bass: 0, mid: 0, treble: 0 };
  }

  _tick() {
    const rate = 0.8 * this._speed.multiplier * (1 + this._metrics.bass * 1.5 + this._metrics.rms * 0.5);
    this._progress = Math.min(100, this._progress + rate);

    if (this._progress >= 100) {
      this._progress = 0;
      this._step = (this._step + 1) % DIAL_UP_MESSAGES.length;
      if (this._step === 0) {
        this._dialAttempt += 1;
        this._speed = pickSpeed();
      }
    }

    this._updateUi();
  }

  _updateUi() {
    if (!this._progressEl) return;

    this._progressEl.textContent = DIAL_UP_MESSAGES[this._step];
    if (this._attemptEl) {
      this._attemptEl.textContent = `Dialing Attempt ${this._dialAttempt} OF ${this._speed.multiplier > 2 ? 7 : 5}`;
    }
    if (this._speedEl) {
      this._speedEl.textContent = `Speed: ${this._speed.speed}`;
    }

    for (let i = 0; i < this._blocks.length; i++) {
      const blockProgress = (i + 1) * 5;
      const block = this._blocks[i];
      block.classList.remove('active', 'partial');
      if (this._progress >= blockProgress) {
        block.classList.add('active');
      } else if (this._progress > i * 5) {
        block.classList.add('partial');
      }
    }
  }
}
