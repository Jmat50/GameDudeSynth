const STORAGE_ENABLED = 'gamedude.vizEnabled';
const STORAGE_OPACITY = 'gamedude.vizOpacity';
const STORAGE_VIBE = 'gamedude.vibe';

/** Resolve vendor URLs from the page URL (works on GitHub Pages subpaths). */
function vendorBaseUrl() {
  return new URL('./public/vendor/projectm/', window.location.href).href;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

function resolveProjectMFactory() {
  if (typeof window.createProjectMModule === 'function') {
    return Promise.resolve(window.createProjectMModule);
  }
  return Promise.reject(
    new Error(
      'projectm.js not loaded. Ensure gamedude-player.html includes ./public/vendor/projectm/projectm.js',
    ),
  );
}

function normalizePresetPath(path) {
  return String(path ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function parsePresetManifest(text) {
  try {
    const json = JSON.parse(text);
    const entries = Array.isArray(json) ? json : json?.presets;
    if (Array.isArray(entries)) {
      return entries
        .map((entry) =>
          normalizePresetPath(
            typeof entry === 'string' ? entry : entry?.sourcePath ?? entry?.path ?? '',
          ),
        )
        .filter(Boolean);
    }
  } catch {
    /* fall through to text parsing */
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(normalizePresetPath)
    .filter(Boolean);
}

function sourceVibe(sourcePath) {
  const normalized = normalizePresetPath(sourcePath);
  const [topLevel] = normalized.split('/');
  return topLevel && !topLevel.startsWith('preset_') && topLevel !== 'presets'
    ? topLevel
    : 'Visuals';
}

export class ProjectMController {
  constructor(hostEl, controlsEl) {
    this.hostEl = hostEl;
    this.controlsEl = controlsEl;
    this.enabled = localStorage.getItem(STORAGE_ENABLED) === 'true';
    this.opacity = parseFloat(localStorage.getItem(STORAGE_OPACITY) ?? '0.88');
    this.audioActive = false;
    this.onEnabledChange = null;
    this._module = null;
    this._raf = null;
    this._resizeObserver = null;
    this._statusEl = null;
    this._errorEl = null;
    this._error = null;
    this._ready = false;
    this._pcmPtr = 0;
    this._pcmCapacity = 0;
    this._presetManifest = [];
    this._runtimePresets = [];
    this._vibeSelect = null;
    this._vibeBusy = false;
    this._queuedVibeApply = false;
    this._random = Math.random;
    this._wasmBase = vendorBaseUrl();
    this._scriptUrl = new URL('projectm.js', this._wasmBase).href;

    document.documentElement.style.setProperty('--viz-opacity', String(this.opacity));
    this._buildControls();
    this._loadPresetManifest().catch((err) => {
      console.warn('[projectM] preset manifest load failed', err);
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

  /** @param {import('./ProjectMAudioTap.js').ProjectMAudioTap} tap */
  wireAudioTap(tap) {
    tap.setPcmHandler((interleaved, samplesPerChannel) => {
      if (!this._module || !this.enabled || !this.audioActive) return;
      this._feedPcm(interleaved, samplesPerChannel);
    });
  }

  async enable() {
    if (this._error) return;
    this.enabled = true;
    localStorage.setItem(STORAGE_ENABLED, 'true');
    this.hostEl.classList.remove('is-disabled');

    if (!this._module) {
      await this._loadModule();
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

  async _loadPresetManifest() {
    const candidates = [
      new URL('public/vendor/projectm/bundled-presets.json', window.location.href).href,
      new URL('scripts/projectm-preset-manifest.txt', window.location.href).href,
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const entries = parsePresetManifest(await response.text());
        if (entries.length) {
          this._presetManifest = entries;
          this._buildVibeOptions(entries);
          if (this._ready) {
            this._syncRuntimePresets();
            await this._applySelectedVibe({ forceNew: true });
          }
          return;
        }
      } catch (err) {
        console.warn('[projectM] failed to load preset manifest', err);
      }
    }

    this._buildVibeOptions([]);
  }

  _buildVibeOptions(entries) {
    if (!this._vibeSelect) return;

    const groups = new Map();
    for (const entry of entries) {
      const vibe = sourceVibe(entry);
      groups.set(vibe, (groups.get(vibe) ?? 0) + 1);
    }
    if (!groups.size && this._runtimePresets.length) {
      for (const preset of this._runtimePresets) {
        groups.set(preset.vibe, (groups.get(preset.vibe) ?? 0) + 1);
      }
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

  _syncRuntimePresets() {
    if (!this._module || !this._ready) return;

    const runtimePresets = [];
    const count = this._module.ccall('pm_get_preset_count', 'number', [], []);
    for (let index = 0; index < count; index++) {
      const runtimePath = this._module.ccall('pm_get_preset_path', 'string', ['number'], [index]);
      const sourcePath = this._presetManifest[index] ?? runtimePath;
      runtimePresets.push({
        index,
        runtimePath,
        sourcePath,
        vibe: sourceVibe(sourcePath),
      });
    }
    this._runtimePresets = runtimePresets;

    if (!this._presetManifest.length) {
      this._buildVibeOptions([]);
    }
  }

  _getSelectedVibePresets() {
    if (!this._runtimePresets.length || !this._vibeSelect) return [];
    const vibe = this._vibeSelect.value;
    if (!vibe || vibe === '__none__') return [];
    return this._runtimePresets.filter((preset) => preset.vibe === vibe);
  }

  _getCurrentPresetIndex() {
    if (!this._module) return -1;
    try {
      return this._module.ccall('pm_get_preset_index', 'number', [], []);
    } catch {
      return -1;
    }
  }

  async _applySelectedVibe({ forceNew = false } = {}) {
    if (!this._module || !this._ready) return;
    if (this._vibeBusy) {
      this._queuedVibeApply = true;
      return;
    }

    const candidates = this._getSelectedVibePresets();
    if (!candidates.length) return;

    this._vibeBusy = true;
    try {
      const currentIndex = this._getCurrentPresetIndex();
      const pool =
        forceNew && candidates.length > 1
          ? candidates.filter((preset) => preset.index !== currentIndex)
          : candidates;
      const pick = pool[Math.floor(this._random() * pool.length)] ?? candidates[0];
      await this._selectRuntimePreset(pick.index);
    } finally {
      this._vibeBusy = false;
      if (this._queuedVibeApply) {
        this._queuedVibeApply = false;
        await this._applySelectedVibe({ forceNew: true });
      }
    }
  }

  async _selectRuntimePreset(targetIndex) {
    if (!this._module || !this._ready) return;

    const count = this._module.ccall('pm_get_preset_count', 'number', [], []);
    if (!count || targetIndex < 0 || targetIndex >= count) return;

    const shouldResume = Boolean(this._raf) || (this.enabled && this.audioActive);
    this._stopLoop();

    try {
      const currentIndex = this._getCurrentPresetIndex();
      let delta = targetIndex - currentIndex;
      if (Math.abs(delta) > count / 2) {
        delta += delta > 0 ? -count : count;
      }

      const functionName = delta < 0 ? 'pm_prev_preset' : 'pm_next_preset';
      for (let step = 0; step < Math.abs(delta); step++) {
        this._module.ccall(functionName, null, [], []);
      }
      const selectedPreset = this._runtimePresets[targetIndex];
      if (selectedPreset) {
        this.hostEl.dataset.vizVibe = selectedPreset.vibe;
        this.hostEl.dataset.vizPresetIndex = String(selectedPreset.index);
      }
      this._renderFrameOnce();
    } finally {
      if (shouldResume && this.enabled && this._ready) {
        this._startLoop();
      }
    }
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
    console.error('[projectM]', message);
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

  async _loadModule() {
    this._applyEnabledState();
    if (this._statusEl) {
      this._statusEl.textContent = 'Loading Milkdrop visualizer...';
    }

    const canvas = this._getOrCreateCanvas();
    const { width, height } = this._hostSize();

    try {
      const factory = await resolveProjectMFactory();
      this._module = await factory({
        canvas,
        locateFile: (path) => new URL(path, this._wasmBase).href,
        scriptDirectory: this._wasmBase,
        mainScriptUrlOrBlob: this._scriptUrl,
        print: (text) => console.log('[projectM]', text),
        printErr: (text) => console.error('[projectM]', text),
      });

      const ok = this._module.ccall('pm_init', 'number', ['number', 'number'], [width, height]);
      if (!ok) {
        throw new Error('projectM failed to initialize (SDL/WebGL). Check the browser console.');
      }

      this._ready = true;
      this._module.ccall('pm_set_preset_locked', null, ['number'], [1]);
      try {
        this._module.ccall('pm_set_auto_preset_switch_enabled', null, ['number'], [0]);
        const presetCount = this._module.ccall('pm_get_preset_count', 'number', [], []);
        console.log(`[projectM] presets loaded: ${presetCount}`);
      } catch {
        /* non-fatal: older builds may not expose introspection helpers */
      }

      this._syncRuntimePresets();
      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
    } catch (err) {
      const message =
        err?.message?.includes('fetch') || err?.message?.includes('wasm')
          ? `Could not load visualizer (${err.message}). Ensure public/vendor/projectm/ exists.`
          : err?.message || String(err);
      this._setError(message);
      throw err;
    }
  }

  _getOrCreateCanvas() {
    let canvas = this.hostEl.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'projectm-canvas';
      this.hostEl.prepend(canvas);
    }
    return canvas;
  }

  _resize() {
    if (!this._module || !this._ready) return;
    const { width, height } = this._hostSize();
    this._module.ccall('pm_resize', null, ['number', 'number'], [width, height]);
  }

  _renderFrameOnce() {
    if (!this._module || !this._ready) return;
    try {
      this._module.ccall('pm_render_frame', null, [], []);
    } catch (err) {
      this._setError(err?.message || 'Render failed');
    }
  }

  _startLoop() {
    if (this._raf || !this._module) return;

    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (!this.enabled || !this._ready) return;
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

  _ensurePcmBuffer(byteLen) {
    if (!this._module) return 0;
    if (this._pcmPtr && this._pcmCapacity >= byteLen) {
      return this._pcmPtr;
    }
    if (this._pcmPtr) {
      this._module._free(this._pcmPtr);
      this._pcmPtr = 0;
      this._pcmCapacity = 0;
    }
    this._pcmPtr = this._module._malloc(byteLen);
    this._pcmCapacity = byteLen;
    return this._pcmPtr;
  }

  _feedPcm(interleaved, samplesPerChannel) {
    const module = this._module;
    if (!module || !interleaved.length) return;
    const byteLen = interleaved.length * 4;
    const ptr = this._ensurePcmBuffer(byteLen);
    if (!ptr) return;
    module.HEAPF32.set(interleaved, ptr >> 2);
    module.ccall(
      'pm_feed_pcm',
      null,
      ['number', 'number', 'number'],
      [ptr, samplesPerChannel, 2],
    );
  }
}
