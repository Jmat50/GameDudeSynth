import {
  ALL_THEME_CLASS_NAMES,
  FX_THEME_OPTIONS,
  THEME_GROUP_LABELS,
  getThemeById,
} from './netstalgiaThemes.js';
import { StarfieldRenderer } from './canvas/StarfieldRenderer.js';
import { MatrixRenderer } from './canvas/MatrixRenderer.js';
import { FlyingToastersRenderer } from './canvas/FlyingToastersRenderer.js';
import { DialUpScene } from './scenes/DialUpScene.js';
import { BsodScene } from './scenes/BsodScene.js';
import { UnderConstructionScene } from './scenes/UnderConstructionScene.js';
import { CrtOverlay } from './overlays/CrtOverlay.js';

const STORAGE_ENABLED = 'gamedude.bgFxEnabled';
const STORAGE_THEME = 'gamedude.bgTheme';
const STORAGE_CRT = 'gamedude.crtOverlay';

const IDLE_METRICS = { rms: 0, bass: 0, mid: 0, treble: 0 };

const EXTRA_LAYER_CLASSES = [
  'bg-canvas-underlay',
  'bg-canvas-underlay-matrix',
  'bg-scene-underlay',
  'bg-crt-underlay',
];

export class BackgroundController {
  constructor(bgLayer, sceneEl, canvasEl, fxOverlayEl, controlsEl) {
    this.bgLayer = bgLayer;
    this.sceneEl = sceneEl;
    this.canvasEl = canvasEl;
    this.fxOverlayEl = fxOverlayEl;
    this.controlsEl = controlsEl;
    this.fxEnabled = localStorage.getItem(STORAGE_ENABLED) === 'true';
    this.crtOverlayEnabled = localStorage.getItem(STORAGE_CRT) === 'true';
    this.themeId = localStorage.getItem(STORAGE_THEME) || FX_THEME_OPTIONS[0]?.id || 'dither-blue';
    this.audioReactive = false;
    this._metrics = IDLE_METRICS;

    this._canvasRenderers = {
      starfield: new StarfieldRenderer(),
      matrix: new MatrixRenderer(),
      toasters: new FlyingToastersRenderer(),
    };

    this._sceneRenderers = {
      dialup: new DialUpScene(),
      bsod: new BsodScene(),
      underConstruction: new UnderConstructionScene(),
      crtStandalone: new CrtOverlay({ standalone: true }),
    };

    this._stackCrt = new CrtOverlay({ standalone: false });
    this._activeCanvas = null;
    this._activeScene = null;

    this._buildControls();
    this._applyTheme();
  }

  get isFxEnabled() {
    return this.fxEnabled;
  }

  setAudioReactive(active) {
    this.audioReactive = active && this.fxEnabled;
    this.bgLayer.dataset.audioReactive = this.audioReactive ? 'true' : 'false';
    this.fxOverlayEl.dataset.audioReactive = this.audioReactive ? 'true' : 'false';
    if (!this.audioReactive) {
      this.applyAudioMetrics(IDLE_METRICS);
    } else {
      this.applyAudioMetrics(this._metrics);
    }
  }

  applyAudioMetrics(metrics) {
    this._metrics = metrics ?? IDLE_METRICS;
    const reactive = this.fxEnabled && this.audioReactive;
    const payload = reactive ? this._metrics : IDLE_METRICS;

    this._setCssVars(payload);
    this._activeCanvas?.setMetrics?.(payload);
    this._activeScene?.setMetrics?.(payload);
    if (this._stackCrtActive()) {
      this._stackCrt.setMetrics(payload);
    }
  }

  _setCssVars({ rms, bass, mid, treble }) {
    this.bgLayer.style.setProperty('--audio-rms', String(rms));
    this.bgLayer.style.setProperty('--audio-bass', String(bass));
    this.bgLayer.style.setProperty('--audio-mid', String(mid));
    this.bgLayer.style.setProperty('--audio-treble', String(treble));
  }

  _stackCrtActive() {
    if (!this.crtOverlayEnabled) return false;
    if (!this.fxEnabled) return true;
    return getThemeById(this.themeId).id !== 'crt';
  }

  _buildControls() {
    this.controlsEl.className = 'bg-fx-controls';
    this.controlsEl.innerHTML = `
      <label class="bg-fx-toggle-wrap">
        <span class="bg-fx-label">BG FX</span>
        <input type="checkbox" class="bg-fx-toggle" role="switch" aria-label="Toggle Netstalgia backgrounds" />
        <span class="bg-fx-thumb-track" aria-hidden="true"><span class="bg-fx-thumb"></span></span>
      </label>
      <label class="bg-fx-toggle-wrap crt-toggle-wrap">
        <span class="bg-fx-label">CRT</span>
        <input type="checkbox" class="crt-overlay-toggle" role="switch" aria-label="Toggle CRT scanline overlay" />
        <span class="bg-fx-thumb-track crt-track" aria-hidden="true"><span class="bg-fx-thumb"></span></span>
      </label>
      <select class="bg-fx-select" aria-label="Background theme" hidden></select>
    `;

    this.toggleInput = this.controlsEl.querySelector('.bg-fx-toggle');
    this.crtToggleInput = this.controlsEl.querySelector('.crt-overlay-toggle');
    this.selectEl = this.controlsEl.querySelector('.bg-fx-select');

    this.toggleInput.checked = this.fxEnabled;
    this.crtToggleInput.checked = this.crtOverlayEnabled;
    this.selectEl.hidden = !this.fxEnabled;

    this._populateSelect();

    this.toggleInput.addEventListener('change', () => {
      this.fxEnabled = this.toggleInput.checked;
      localStorage.setItem(STORAGE_ENABLED, String(this.fxEnabled));
      this.selectEl.hidden = !this.fxEnabled;
      this._applyTheme();
    });

    this.crtToggleInput.addEventListener('change', () => {
      this.crtOverlayEnabled = this.crtToggleInput.checked;
      localStorage.setItem(STORAGE_CRT, String(this.crtOverlayEnabled));
      this._applyCrtStack();
      this.applyAudioMetrics(this._metrics);
    });

    this.selectEl.addEventListener('change', () => {
      this.themeId = this.selectEl.value;
      localStorage.setItem(STORAGE_THEME, this.themeId);
      this._applyTheme();
    });
  }

  _populateSelect() {
    this.selectEl.innerHTML = '';
    const groups = ['css', 'canvas', 'scenes'];

    for (const groupId of groups) {
      const themes = FX_THEME_OPTIONS.filter((t) => t.group === groupId);
      if (!themes.length) continue;

      const optgroup = document.createElement('optgroup');
      optgroup.label = THEME_GROUP_LABELS[groupId] ?? groupId;

      for (const theme of themes) {
        const opt = document.createElement('option');
        opt.value = theme.id;
        opt.textContent = theme.label;
        if (theme.id === this.themeId) opt.selected = true;
        optgroup.appendChild(opt);
      }

      this.selectEl.appendChild(optgroup);
    }
  }

  _applyTheme() {
    this._stopAllRenderers();
    this._clearLayerClasses();

    if (!this.fxEnabled) {
      this.bgLayer.classList.add('bg-gamedude-default');
      this.canvasEl.hidden = true;
      this.setAudioReactive(this.audioReactive);
      this._applyCrtStack();
      return;
    }

    const theme = getThemeById(this.themeId);

    if (theme.underlayClass) {
      this.bgLayer.classList.add(theme.underlayClass);
    }

    if (theme.type === 'css') {
      this.bgLayer.classList.add(theme.className);
      this.canvasEl.hidden = true;
    } else if (theme.type === 'canvas') {
      this.canvasEl.hidden = false;
      this._activeCanvas = this._canvasRenderers[theme.renderer];
      this._activeCanvas?.start(this.canvasEl);
      this._activeCanvas?.setMetrics(this._metrics);
    } else if (theme.type === 'scene') {
      this.canvasEl.hidden = true;
      this._activeScene = this._sceneRenderers[theme.renderer];
      if (theme.renderer === 'crtStandalone') {
        this._activeScene.start(this.fxOverlayEl);
      } else {
        this._activeScene.start(this.sceneEl);
      }
      this._activeScene?.setMetrics(this._metrics);
    }

    this._applyCrtStack();
    this.setAudioReactive(this.audioReactive);
  }

  _applyCrtStack() {
    const theme = getThemeById(this.themeId);
    if (this._stackCrtActive()) {
      this._stackCrt.start(this.fxOverlayEl);
      this._stackCrt.setMetrics(this._metrics);
    } else if (theme.renderer !== 'crtStandalone') {
      this._stackCrt.stop();
    }
  }

  _clearLayerClasses() {
    for (const cls of ALL_THEME_CLASS_NAMES) {
      this.bgLayer.classList.remove(cls);
    }
    for (const cls of EXTRA_LAYER_CLASSES) {
      this.bgLayer.classList.remove(cls);
    }
  }

  _stopAllRenderers() {
    for (const renderer of Object.values(this._canvasRenderers)) {
      renderer.stop();
    }
    for (const renderer of Object.values(this._sceneRenderers)) {
      renderer.stop();
    }
    this._stackCrt.stop();
    this.sceneEl.innerHTML = '';
    this._activeCanvas = null;
    this._activeScene = null;
  }
}
