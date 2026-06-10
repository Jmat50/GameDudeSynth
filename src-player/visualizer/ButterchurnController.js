const STORAGE_ENABLED = 'gamedude.vizEnabled';
const STORAGE_OPACITY = 'gamedude.vizOpacity';
const STORAGE_VIBE = 'gamedude.vibe';

/** Resolve vendor URLs from the page URL (works on GitHub Pages subpaths). */
function vendorBaseUrl() {
  return new URL('./public/vendor/butterchurn/', window.location.href).href;
}

function supportsWebGL2() {
  try {
    const api = window.butterchurn?.default ?? window.butterchurn;
    if (typeof api?.isSupported === 'function') {
      return api.isSupported();
    }
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

function resolveButterchurn() {
  const api = window.butterchurn?.default ?? window.butterchurn;
  if (api?.createVisualizer) {
    return Promise.resolve(api);
  }
  return Promise.reject(
    new Error(
      'butterchurn not loaded. Ensure gamedude-player.html includes ./public/vendor/butterchurn/butterchurn.iife.js',
    ),
  );
}

function getHowlerAudioContext() {
  if (typeof Howler === 'undefined') return null;
  if (!Howler.ctx) {
    try {
      Howler.volume();
    } catch {
      return null;
    }
  }
  return Howler.ctx ?? null;
}

function getHowlerMasterGain() {
  if (typeof Howler === 'undefined') return null;
  return Howler.masterGain ?? null;
}

export class ButterchurnController {
  constructor(hostEl, controlsEl) {
    this.hostEl = hostEl;
    this.controlsEl = controlsEl;
    this.enabled = localStorage.getItem(STORAGE_ENABLED) === 'true';
    this.opacity = parseFloat(localStorage.getItem(STORAGE_OPACITY) ?? '0.88');
    this.audioActive = false;
    this.onEnabledChange = null;
    this._visualizer = null;
    this._raf = null;
    this._resizeObserver = null;
    this._statusEl = null;
    this._errorEl = null;
    this._error = null;
    this._ready = false;
    this._catalog = [];
    this._vibeSelect = null;
    this._vibeBusy = false;
    this._queuedVibeApply = false;
    this._currentPresetSlug = null;
    this._random = Math.random;
    this._vendorBase = vendorBaseUrl();
    this._extraImagesLoaded = false;

    document.documentElement.style.setProperty('--viz-opacity', String(this.opacity));
    this._buildControls();
    this._loadCatalog().catch((err) => {
      console.warn('[butterchurn] preset catalog load failed', err);
    });
    this._applyEnabledState();

    if (!supportsWebGL2()) {
      this._setError('WebGL2 is required for Milkdrop visuals.');
      return;
    }

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.hostEl);
  }

  get isEnabled() {
    return this.enabled;
  }

  setAudioActive(active) {
    this.audioActive = active;
    if (this.enabled && this._ready && this.audioActive) {
      this._startLoop();
    } else {
      this._stopLoop();
    }
  }

  async enable() {
    if (this._error) return;
    this.enabled = true;
    localStorage.setItem(STORAGE_ENABLED, 'true');
    this.hostEl.classList.remove('is-disabled');

    if (!this._visualizer) {
      await this._initVisualizer();
    }
    if (this._ready) {
      await this._applySelectedVibe({ forceNew: true });
    }
    if (this._ready && this.audioActive) {
      this._startLoop();
    }
    this.onEnabledChange?.(true);
  }

  disable() {
    this.enabled = false;
    localStorage.setItem(STORAGE_ENABLED, 'false');
    this.hostEl.classList.add('is-disabled');
    this._stopLoop();
    this._disconnectAudio();
    this.onEnabledChange?.(false);
  }

  _buildControls() {
    this.controlsEl.innerHTML = '';
    this.controlsEl.className = 'viz-controls';

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'viz-controls-row';
    toggleWrap.innerHTML = `
      <span class="viz-label">Viz</span>
      <input type="checkbox" class="viz-toggle" id="viz-enabled-toggle" />
      <span class="viz-thumb-track"><span class="viz-thumb"></span></span>
    `;
    const toggle = toggleWrap.querySelector('#viz-enabled-toggle');
    toggle.checked = this.enabled;
    toggle.addEventListener('change', async () => {
      if (toggle.checked) {
        await this.enable();
      } else {
        this.disable();
      }
    });

    const vibeRow = document.createElement('label');
    vibeRow.className = 'viz-controls-row';
    const vibeLabel = document.createElement('span');
    vibeLabel.className = 'viz-label';
    vibeLabel.textContent = 'Vibe';

    const vibeSelect = document.createElement('select');
    vibeSelect.className = 'viz-vibe-select';
    vibeSelect.disabled = true;
    vibeSelect.appendChild(new Option('Loading Vibes...', '__loading__'));
    vibeSelect.addEventListener('change', () => {
      localStorage.setItem(STORAGE_VIBE, vibeSelect.value);
      this._applySelectedVibe({ forceNew: true }).catch((err) => {
        this._setError(err?.message || 'Vibe switch failed');
      });
    });
    vibeRow.append(vibeLabel, vibeSelect);
    this._vibeSelect = vibeSelect;

    const opacityRow = document.createElement('label');
    opacityRow.className = 'viz-controls-row';
    opacityRow.innerHTML = '<span class="viz-label">Dim</span>';
    const opacityInput = document.createElement('input');
    opacityInput.type = 'range';
    opacityInput.className = 'viz-opacity';
    opacityInput.min = '0.35';
    opacityInput.max = '1';
    opacityInput.step = '0.05';
    opacityInput.value = String(this.opacity);
    opacityInput.addEventListener('input', () => {
      this.opacity = parseFloat(opacityInput.value);
      localStorage.setItem(STORAGE_OPACITY, String(this.opacity));
      document.documentElement.style.setProperty('--viz-opacity', String(this.opacity));
    });
    opacityRow.appendChild(opacityInput);

    this._errorEl = document.createElement('p');
    this._errorEl.className = 'viz-error';
    this._errorEl.hidden = true;

    this.controlsEl.append(toggleWrap, vibeRow, opacityRow, this._errorEl);

    if (this.enabled) {
      this.enable().catch((err) => this._setError(err.message));
    }
  }

  async _loadCatalog() {
    const url = new URL('preset-catalog.json', this._vendorBase).href;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load preset catalog (${response.status})`);
    }
    this._catalog = await response.json();
    this._buildVibeOptions();
    if (this._ready) {
      await this._applySelectedVibe({ forceNew: true });
    }
  }

  _buildVibeOptions() {
    if (!this._vibeSelect) return;

    const groups = new Map();
    for (const entry of this._catalog) {
      groups.set(entry.vibe, (groups.get(entry.vibe) ?? 0) + 1);
    }

    this._vibeSelect.innerHTML = '';
    if (!groups.size) {
      this._vibeSelect.appendChild(new Option('No Vibes Found', '__none__'));
      this._vibeSelect.disabled = true;
      return;
    }

    for (const [vibe, count] of groups) {
      const option = document.createElement('option');
      option.value = vibe;
      option.textContent = count > 1 ? `${vibe} (${count})` : vibe;
      this._vibeSelect.appendChild(option);
    }

    const saved = localStorage.getItem(STORAGE_VIBE);
    if (saved && [...this._vibeSelect.options].some((option) => option.value === saved)) {
      this._vibeSelect.value = saved;
    } else {
      this._vibeSelect.selectedIndex = 0;
      localStorage.setItem(STORAGE_VIBE, this._vibeSelect.value);
    }
    this._vibeSelect.disabled = false;
  }

  _getSelectedVibePresets() {
    if (!this._catalog.length || !this._vibeSelect) return [];
    const vibe = this._vibeSelect.value;
    if (!vibe || vibe === '__none__') return [];
    return this._catalog.filter((entry) => entry.vibe === vibe);
  }

  async _applySelectedVibe({ forceNew = false } = {}) {
    if (!this._visualizer || !this._ready) return;
    if (this._vibeBusy) {
      this._queuedVibeApply = true;
      return;
    }

    const candidates = this._getSelectedVibePresets();
    if (!candidates.length) return;

    this._vibeBusy = true;
    try {
      const pool =
        forceNew && candidates.length > 1
          ? candidates.filter((entry) => entry.slug !== this._currentPresetSlug)
          : candidates;
      const pick = pool[Math.floor(this._random() * pool.length)] ?? candidates[0];
      await this._loadPresetEntry(pick);
    } finally {
      this._vibeBusy = false;
      if (this._queuedVibeApply) {
        this._queuedVibeApply = false;
        await this._applySelectedVibe({ forceNew: true });
      }
    }
  }

  async _loadPresetEntry(entry) {
    const presetUrl = new URL(entry.url, this._vendorBase).href;
    const response = await fetch(presetUrl);
    if (!response.ok) {
      throw new Error(`Could not load preset (${response.status})`);
    }
    const presetJson = await response.json();
    await this._visualizer.loadPreset(presetJson, 1.5);
    this._currentPresetSlug = entry.slug;
    this.hostEl.dataset.vizVibe = entry.vibe;
    this.hostEl.dataset.vizPresetSlug = entry.slug;
    this.hostEl.dataset.vizPresetIndex = String(entry.index);
    this._renderFrameOnce();
  }

  _setError(message) {
    this._error = message;
    if (this._errorEl) {
      this._errorEl.hidden = false;
      this._errorEl.textContent = message;
    }
    if (this._statusEl) {
      this._statusEl.textContent = message;
    }
    console.error('[butterchurn]', message);
  }

  _applyEnabledState() {
    if (!this._statusEl && this.enabled && !this._ready) {
      this._statusEl = document.createElement('div');
      this._statusEl.className = 'viz-status';
      this._statusEl.textContent = 'Loading Milkdrop visualizer...';
      this.hostEl.appendChild(this._statusEl);
    }
  }

  _hostSize() {
    const width = Math.max(1, Math.round(this.hostEl.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.round(this.hostEl.clientHeight || window.innerHeight));
    return { width, height };
  }

  async _initVisualizer() {
    this._applyEnabledState();
    if (this._statusEl) {
      this._statusEl.textContent = 'Loading Milkdrop visualizer...';
    }

    const audioCtx = getHowlerAudioContext();
    if (!audioCtx) {
      throw new Error('Web Audio is not available yet. Start playback once, then enable Viz.');
    }

    const canvas = this._getOrCreateCanvas();
    const { width, height } = this._hostSize();
    const pixelRatio = window.devicePixelRatio || 1;

    try {
      const butterchurn = await resolveButterchurn();
      this._visualizer = butterchurn.createVisualizer(audioCtx, canvas, {
        width,
        height,
        pixelRatio,
      });

      await this._loadExtraImages();
      this._connectAudio();
      this._ready = true;

      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
      if (this._catalog.length) {
        this._buildVibeOptions();
      }
    } catch (err) {
      const message =
        err?.message?.includes('fetch') || err?.message?.includes('butterchurn')
          ? `Could not load visualizer (${err.message}). Ensure public/vendor/butterchurn/ exists.`
          : err?.message || String(err);
      this._setError(message);
      throw err;
    }
  }

  async _loadExtraImages() {
    if (this._extraImagesLoaded || !this._visualizer?.loadExtraImages) {
      return;
    }
    try {
      const imageDir = new URL('imageData/', this._vendorBase).href;
      const manifestUrl = new URL('imageData/manifest.json', this._vendorBase).href;
      const response = await fetch(manifestUrl);
      if (!response.ok) return;
      const files = await response.json();
      if (!Array.isArray(files) || !files.length) return;

      const imageMap = {};
      await Promise.all(
        files.map(async (name) => {
          const imageResponse = await fetch(new URL(name, imageDir));
          if (!imageResponse.ok) return;
          const blob = await imageResponse.blob();
          imageMap[name] = await createImageBitmap(blob);
        }),
      );
      if (Object.keys(imageMap).length) {
        this._visualizer.loadExtraImages(imageMap);
      }
      this._extraImagesLoaded = true;
    } catch (err) {
      console.warn('[butterchurn] extra image preload skipped', err);
    }
  }

  _connectAudio() {
    const masterGain = getHowlerMasterGain();
    if (this._visualizer && masterGain) {
      this._visualizer.connectAudio(masterGain);
    }
  }

  _disconnectAudio() {
    if (this._visualizer?.disconnectAudio) {
      try {
        this._visualizer.disconnectAudio();
      } catch {
        /* ignore */
      }
    }
  }

  _getOrCreateCanvas() {
    let canvas = this.hostEl.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'viz-canvas';
      this.hostEl.prepend(canvas);
    }
    return canvas;
  }

  _resize() {
    if (!this._visualizer || !this._ready) return;
    const { width, height } = this._hostSize();
    const pixelRatio = window.devicePixelRatio || 1;
    this._visualizer.setRendererSize(width, height, { pixelRatio });
  }

  _renderFrameOnce() {
    if (!this._visualizer || !this._ready) return;
    try {
      this._visualizer.render();
    } catch (err) {
      this._setError(err?.message || 'Render failed');
    }
  }

  _startLoop() {
    if (this._raf || !this._visualizer) return;

    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (!this.enabled || !this._ready || !this.audioActive) return;
      this._renderFrameOnce();
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }
}
