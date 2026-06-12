const STORAGE_ENABLED = 'gamedude.vizEnabled';
const STORAGE_OPACITY = 'gamedude.vizOpacity';
const STORAGE_PACK = 'gamedude.vizPack';
const STORAGE_PRESET_SLUG = 'gamedude.vizPresetSlug';
const LEGACY_STORAGE_VIBE = 'gamedude.vibe';

const PACK_ORDER = ['base', 'extra', 'image', 'minimal', 'nonMinimal', 'md1', 'other'];

const PACK_LABELS = {
  base: 'Base',
  extra: 'Extra',
  image: 'Image',
  minimal: 'Minimal',
  nonMinimal: 'Non-Minimal',
  md1: 'MD1',
  other: 'Other',
};

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
    this._catalogMeta = null;
    this._packSelect = null;
    this._presetSelect = null;
    this._presetBusy = false;
    this._queuedPresetSlug = null;
    this._currentPresetSlug = null;
    this._loadedImages = new Map();
    this._vendorBase = vendorBaseUrl();

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
      await this._applyCurrentSelection();
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

    const packRow = document.createElement('label');
    packRow.className = 'viz-controls-row';
    const packLabel = document.createElement('span');
    packLabel.className = 'viz-label';
    packLabel.textContent = 'Pack';

    const packSelect = document.createElement('select');
    packSelect.className = 'viz-pack-select';
    packSelect.disabled = true;
    packSelect.appendChild(new Option('Loading...', '__loading__'));
    packSelect.addEventListener('change', () => {
      localStorage.setItem(STORAGE_PACK, packSelect.value);
      this._buildPresetOptions();
      const firstSlug = this._presetSelect?.value;
      if (firstSlug && firstSlug !== '__none__') {
        this._applyPresetSlug(firstSlug).catch((err) => {
          this._setError(err?.message || 'Preset switch failed');
        });
      }
    });
    packRow.append(packLabel, packSelect);
    this._packSelect = packSelect;

    const presetRow = document.createElement('label');
    presetRow.className = 'viz-controls-row';
    const presetLabel = document.createElement('span');
    presetLabel.className = 'viz-label';
    presetLabel.textContent = 'Preset';

    const presetSelect = document.createElement('select');
    presetSelect.className = 'viz-preset-select';
    presetSelect.disabled = true;
    presetSelect.appendChild(new Option('Loading...', '__loading__'));
    presetSelect.addEventListener('change', () => {
      const slug = presetSelect.value;
      if (!slug || slug.startsWith('__')) return;
      localStorage.setItem(STORAGE_PRESET_SLUG, slug);
      this._applyPresetSlug(slug).catch((err) => {
        this._setError(err?.message || 'Preset switch failed');
      });
    });
    presetRow.append(presetLabel, presetSelect);
    this._presetSelect = presetSelect;

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

    this.controlsEl.append(toggleWrap, packRow, presetRow, opacityRow, this._errorEl);

    if (this.enabled) {
      this.enable().catch((err) => this._setError(err.message));
    }
  }

  async _loadCatalog() {
    const catalogUrl = new URL('preset-catalog.json', this._vendorBase).href;
    const metaUrl = new URL('preset-catalog-meta.json', this._vendorBase).href;

    const [catalogResponse, metaResponse] = await Promise.all([fetch(catalogUrl), fetch(metaUrl)]);
    if (!catalogResponse.ok) {
      throw new Error(`Could not load preset catalog (${catalogResponse.status})`);
    }
    this._catalog = await catalogResponse.json();
    if (metaResponse.ok) {
      this._catalogMeta = await metaResponse.json();
    }
    this._migrateLegacyStorage();
    this._buildPackOptions();
    this._buildPresetOptions();
    if (this._ready) {
      await this._applyCurrentSelection();
    }
  }

  _migrateLegacyStorage() {
    if (localStorage.getItem(STORAGE_PACK)) return;

    const legacyVibe = localStorage.getItem(LEGACY_STORAGE_VIBE);
    if (!legacyVibe) return;

    const match = this._catalog.find((entry) => entry.vibe === legacyVibe);
    if (match?.packs?.length) {
      localStorage.setItem(STORAGE_PACK, match.packs[0]);
      localStorage.setItem(STORAGE_PRESET_SLUG, match.slug);
    }
  }

  _packCounts() {
    if (this._catalogMeta?.packs?.length) {
      return new Map(this._catalogMeta.packs.map((pack) => [pack.id, pack.count]));
    }
    const counts = new Map();
    for (const entry of this._catalog) {
      for (const packId of entry.packs ?? []) {
        counts.set(packId, (counts.get(packId) ?? 0) + 1);
      }
    }
    return counts;
  }

  _buildPackOptions() {
    if (!this._packSelect) return;

    const counts = this._packCounts();
    const packIds = [...counts.keys()].sort(
      (a, b) => PACK_ORDER.indexOf(a) - PACK_ORDER.indexOf(b),
    );

    this._packSelect.innerHTML = '';
    if (!packIds.length) {
      this._packSelect.appendChild(new Option('No packs found', '__none__'));
      this._packSelect.disabled = true;
      return;
    }

    for (const packId of packIds) {
      const count = counts.get(packId) ?? 0;
      const label = PACK_LABELS[packId] ?? packId;
      const option = document.createElement('option');
      option.value = packId;
      option.textContent = count > 0 ? `${label} (${count})` : label;
      this._packSelect.appendChild(option);
    }

    const saved = localStorage.getItem(STORAGE_PACK);
    if (saved && [...this._packSelect.options].some((option) => option.value === saved)) {
      this._packSelect.value = saved;
    } else {
      this._packSelect.selectedIndex = 0;
      localStorage.setItem(STORAGE_PACK, this._packSelect.value);
    }
    this._packSelect.disabled = false;
  }

  _presetsForPack(packId) {
    if (!packId || packId.startsWith('__')) return [];
    return this._catalog
      .filter((entry) => entry.packs?.includes(packId))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  _buildPresetOptions() {
    if (!this._presetSelect || !this._packSelect) return;

    const packId = this._packSelect.value;
    const presets = this._presetsForPack(packId);

    this._presetSelect.innerHTML = '';
    if (!presets.length) {
      this._presetSelect.appendChild(new Option('No presets in pack', '__none__'));
      this._presetSelect.disabled = true;
      return;
    }

    for (const entry of presets) {
      const option = document.createElement('option');
      option.value = entry.slug;
      option.textContent = entry.key;
      option.title = entry.key;
      this._presetSelect.appendChild(option);
    }

    const saved = localStorage.getItem(STORAGE_PRESET_SLUG);
    const savedInPack = saved && presets.some((entry) => entry.slug === saved);
    if (savedInPack) {
      this._presetSelect.value = saved;
    } else {
      this._presetSelect.selectedIndex = 0;
      localStorage.setItem(STORAGE_PRESET_SLUG, this._presetSelect.value);
    }
    this._presetSelect.disabled = false;
  }

  _entryForSlug(slug) {
    return this._catalog.find((entry) => entry.slug === slug) ?? null;
  }

  async _applyCurrentSelection() {
    if (!this._visualizer || !this._ready) return;

    const slug =
      this._presetSelect?.value && !this._presetSelect.value.startsWith('__')
        ? this._presetSelect.value
        : localStorage.getItem(STORAGE_PRESET_SLUG);

    if (slug && this._entryForSlug(slug)) {
      await this._applyPresetSlug(slug);
      return;
    }

    const packId = this._packSelect?.value;
    const presets = this._presetsForPack(packId);
    if (presets[0]) {
      await this._applyPresetSlug(presets[0].slug);
    }
  }

  async _applyPresetSlug(slug) {
    if (!this._visualizer || !this._ready) return;
    if (this._presetBusy) {
      this._queuedPresetSlug = slug;
      return;
    }

    const entry = this._entryForSlug(slug);
    if (!entry) return;

    this._presetBusy = true;
    try {
      if (this._presetSelect && this._presetSelect.value !== slug) {
        this._presetSelect.value = slug;
      }
      await this._loadPresetEntry(entry);
      localStorage.setItem(STORAGE_PRESET_SLUG, slug);
    } finally {
      this._presetBusy = false;
      if (this._queuedPresetSlug) {
        const next = this._queuedPresetSlug;
        this._queuedPresetSlug = null;
        await this._applyPresetSlug(next);
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
    await this._loadPresetImages(entry);
    await this._visualizer.loadPreset(presetJson, 1.5);
    this._currentPresetSlug = entry.slug;
    this.hostEl.dataset.vizPack = this._packSelect?.value ?? entry.packs?.[0] ?? '';
    this.hostEl.dataset.vizPresetSlug = entry.slug;
    this.hostEl.dataset.vizPresetIndex = String(entry.index);
    if (entry.vibe) {
      this.hostEl.dataset.vizVibe = entry.vibe;
    } else {
      delete this.hostEl.dataset.vizVibe;
    }
    this._renderFrameOnce();
  }

  async _loadPresetImages(entry) {
    if (!this._visualizer?.loadExtraImages) return;

    const refs = entry.images ?? [];
    if (!refs.length) return;

    const imageDir = new URL('imageData/', this._vendorBase).href;
    const pending = refs.filter((name) => !this._loadedImages.has(name));
    if (!pending.length) {
      this._visualizer.loadExtraImages(Object.fromEntries(this._loadedImages));
      return;
    }

    const imageMap = {};
    await Promise.all(
      pending.map(async (name) => {
        try {
          const imageResponse = await fetch(new URL(name, imageDir));
          if (!imageResponse.ok) return;
          const blob = await imageResponse.blob();
          const bitmap = await createImageBitmap(blob);
          this._loadedImages.set(name, bitmap);
          imageMap[name] = bitmap;
        } catch (err) {
          console.warn('[butterchurn] image load failed', name, err);
        }
      }),
    );

    if (Object.keys(imageMap).length) {
      this._visualizer.loadExtraImages({
        ...Object.fromEntries(this._loadedImages),
        ...imageMap,
      });
    }
  }

  _setError(message) {
    this._error = message;
    if (this._errorEl) {
      this._errorEl.hidden = false;
      this._errorEl.textContent = message;
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

      this._connectAudio();
      this._ready = true;

      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
      if (this._catalog.length) {
        this._buildPackOptions();
        this._buildPresetOptions();
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
