import {
  ALL_THEME_CLASS_NAMES,
  FX_THEME_OPTIONS,
  getThemeById,
} from './netstalgiaThemes.js';
import { StarfieldRenderer } from './canvas/StarfieldRenderer.js';
import { MatrixRenderer } from './canvas/MatrixRenderer.js';

const STORAGE_ENABLED = 'gamedude.bgFxEnabled';
const STORAGE_THEME = 'gamedude.bgTheme';

const IDLE_METRICS = { rms: 0, bass: 0, mid: 0, treble: 0 };

export class BackgroundController {
  constructor(bgLayer, canvasEl, controlsEl) {
    this.bgLayer = bgLayer;
    this.canvasEl = canvasEl;
    this.controlsEl = controlsEl;
    this.fxEnabled = localStorage.getItem(STORAGE_ENABLED) === 'true';
    this.themeId = localStorage.getItem(STORAGE_THEME) || FX_THEME_OPTIONS[0]?.id || 'dither-blue';
    this.audioReactive = false;
    this._metrics = IDLE_METRICS;
    this._renderers = {
      starfield: new StarfieldRenderer(),
      matrix: new MatrixRenderer(),
    };
    this._activeRenderer = null;

    this._buildControls();
    this._applyTheme();
  }

  get isFxEnabled() {
    return this.fxEnabled;
  }

  setAudioReactive(active) {
    this.audioReactive = active && this.fxEnabled;
    this.bgLayer.dataset.audioReactive = this.audioReactive ? 'true' : 'false';
    if (!this.audioReactive) {
      this.applyAudioMetrics(IDLE_METRICS);
    } else {
      this.applyAudioMetrics(this._metrics);
    }
  }

  applyAudioMetrics(metrics) {
    this._metrics = metrics ?? IDLE_METRICS;
    if (!this.fxEnabled || !this.audioReactive) {
      this._setCssVars(IDLE_METRICS);
      this._activeRenderer?.setMetrics?.(IDLE_METRICS);
      return;
    }

    this._setCssVars(this._metrics);
    this._activeRenderer?.setMetrics?.(this._metrics);
  }

  _setCssVars({ rms, bass, mid, treble }) {
    this.bgLayer.style.setProperty('--audio-rms', String(rms));
    this.bgLayer.style.setProperty('--audio-bass', String(bass));
    this.bgLayer.style.setProperty('--audio-mid', String(mid));
    this.bgLayer.style.setProperty('--audio-treble', String(treble));
  }

  _buildControls() {
    this.controlsEl.className = 'bg-fx-controls';
    this.controlsEl.innerHTML = `
      <label class="bg-fx-toggle-wrap">
        <span class="bg-fx-label">BG FX</span>
        <input type="checkbox" class="bg-fx-toggle" role="switch" aria-label="Toggle Netstalgia backgrounds" />
        <span class="bg-fx-thumb-track" aria-hidden="true"><span class="bg-fx-thumb"></span></span>
      </label>
      <select class="bg-fx-select" aria-label="Background theme" hidden></select>
    `;

    this.toggleInput = this.controlsEl.querySelector('.bg-fx-toggle');
    this.selectEl = this.controlsEl.querySelector('.bg-fx-select');

    this.toggleInput.checked = this.fxEnabled;
    this.selectEl.hidden = !this.fxEnabled;

    for (const theme of FX_THEME_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = theme.id;
      opt.textContent = theme.label;
      if (theme.group === 'canvas') opt.dataset.group = 'canvas';
      else opt.dataset.group = 'css';
      if (theme.id === this.themeId) opt.selected = true;
      this.selectEl.appendChild(opt);
    }

    this.toggleInput.addEventListener('change', () => {
      this.fxEnabled = this.toggleInput.checked;
      localStorage.setItem(STORAGE_ENABLED, String(this.fxEnabled));
      this.selectEl.hidden = !this.fxEnabled;
      this._applyTheme();
    });

    this.selectEl.addEventListener('change', () => {
      this.themeId = this.selectEl.value;
      localStorage.setItem(STORAGE_THEME, this.themeId);
      this._applyTheme();
    });
  }

  _applyTheme() {
    this._stopCanvasRenderer();

    for (const cls of ALL_THEME_CLASS_NAMES) {
      this.bgLayer.classList.remove(cls);
    }
    this.bgLayer.classList.remove('bg-canvas-underlay', 'bg-canvas-underlay-matrix');

    if (!this.fxEnabled) {
      this.bgLayer.classList.add('bg-gamedude-default');
      this.canvasEl.hidden = true;
      this.setAudioReactive(false);
      return;
    }

    const theme = getThemeById(this.themeId);

    if (theme.type === 'canvas') {
      this.bgLayer.classList.add(theme.underlayClass ?? 'bg-canvas-underlay');
      this.canvasEl.hidden = false;
      this._activeRenderer = this._renderers[theme.renderer];
      this._activeRenderer?.start(this.canvasEl);
      this._activeRenderer?.setMetrics(this._metrics);
    } else {
      this.bgLayer.classList.add(theme.className);
      this.canvasEl.hidden = true;
      this._activeRenderer = null;
    }

    this.setAudioReactive(this.audioReactive);
  }

  _stopCanvasRenderer() {
    for (const renderer of Object.values(this._renderers)) {
      renderer.stop();
    }
    this._activeRenderer = null;
  }
}
