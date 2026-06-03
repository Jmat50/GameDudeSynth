const STORAGE_ENABLED = 'gamedude.vizEnabled';
const STORAGE_OPACITY = 'gamedude.vizOpacity';
const PRESET_MIN_INTERVAL_MS = 170;
const PRESET_UNLOCK_DELAY_MS = 230;
const PRESET_DEFER_FLOOR_MS = 20;

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
    this._error = null;
    this._ready = false;
    this._pcmPtr = 0;
    this._pcmCapacity = 0;
    this._presetButtons = [];
    this._presetUnlockTimer = null;
    this._presetLastSwitchMs = 0;
    this._presetQueueDir = 0;
    this._presetBusy = false;
    this._presetLabelEl = null;
    this._presetManifest = null;
    this._vibeSelect = null;
    this._autoShuffle = false;
    this._rmsHistory = [];
    this._lastBeatMs = 0;
    this._wasmBase = vendorBaseUrl();
    this._scriptUrl = new URL('projectm.js', this._wasmBase).href;
    document.documentElement.style.setProperty('--viz-opacity', String(this.opacity));
    this._buildControls();
    this._loadPresetManifest().catch((err) => {
      console.warn('[projectM] preset manifest load failed', err);
    });
    this._applyEnabledState(false);

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
    this._setPresetButtonsDisabled(!this._ready);
    if (this._ready && this.audioActive) {
      this._startLoop();
    }
    this.onEnabledChange?.(true);
  }

  disable() {
    this.enabled = false;
    localStorage.setItem(STORAGE_ENABLED, 'false');
    this.hostEl.classList.add('is-disabled');
    this._setPresetButtonsDisabled(true);
    this._presetQueueDir = 0;
    this._presetBusy = false;
    if (this._presetUnlockTimer) {
      clearTimeout(this._presetUnlockTimer);
      this._presetUnlockTimer = null;
    }
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

    const presetRow = document.createElement('div');
    presetRow.className = 'viz-controls-row';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'viz-btn';
    prevBtn.textContent = '◀ Preset';
    prevBtn.addEventListener('click', () => this._changePreset(-1));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'viz-btn';
    nextBtn.textContent = 'Preset ▶';
    nextBtn.addEventListener('click', () => this._changePreset(1));

    this._presetButtons = [prevBtn, nextBtn];
    this._setPresetButtonsDisabled(true);
    // Vibe selector + shuffle (placed in the preset row for compact top-right controls)
    const vibeSelect = document.createElement('select');
    vibeSelect.className = 'viz-vibe-select';
    vibeSelect.disabled = true;
    vibeSelect.appendChild(new Option('Loading Vibes...', '__loading__'));
    const vibeLabel = document.createElement('span');
    vibeLabel.className = 'viz-label';
    vibeLabel.textContent = 'Vibe';
    const shuffleBtn = document.createElement('button');
    shuffleBtn.type = 'button';
    shuffleBtn.className = 'viz-btn';
    shuffleBtn.textContent = 'Shuffle';
    shuffleBtn.addEventListener('click', () => this._shufflePreset());
    presetRow.append(prevBtn, vibeLabel, vibeSelect, shuffleBtn, nextBtn);

    this._vibeSelect = vibeSelect;

    this._presetLabelEl = document.createElement('p');
    this._presetLabelEl.className = 'viz-preset-label';
    this._presetLabelEl.textContent = 'Preset —';

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

    // Auto-shuffle toggle
    const autoRow = document.createElement('label');
    autoRow.className = 'viz-controls-row';
    autoRow.innerHTML = `
      <span class="viz-label">Auto</span>
      <input type="checkbox" class="viz-auto-toggle" id="viz-auto-toggle" />
      <span class="viz-auto-text">Beat-shuffle</span>
    `;
    const autoToggle = autoRow.querySelector('#viz-auto-toggle');
    this._autoShuffle = localStorage.getItem('gamedude.vizAutoShuffle') === 'true';
    autoToggle.checked = this._autoShuffle;
    autoToggle.addEventListener('change', () => {
      this._autoShuffle = autoToggle.checked;
      localStorage.setItem('gamedude.vizAutoShuffle', this._autoShuffle ? 'true' : 'false');
    });
    opacityRow.appendChild(autoRow);

    this._errorEl = document.createElement('p');
    this._errorEl.className = 'viz-error';
    this._errorEl.hidden = true;

    this.controlsEl.append(toggleWrap, presetRow, this._presetLabelEl, opacityRow, this._errorEl);

    if (this.enabled) {
      this.enable().catch((err) => this._setError(err.message));
    }
  }

  async _loadPresetManifest() {
    // Try known locations for a curated manifest (newline-separated or JSON)
    const candidates = [
      new URL('public/vendor/projectm/presets/manifest.json', window.location.href).href,
      new URL('public/vendor/projectm/presets/manifest.txt', window.location.href).href,
      new URL('scripts/projectm-preset-manifest.txt', window.location.href).href,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        let entries = [];
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) entries = json;
        } catch {
          entries = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/^#.*$/, '').trim()).filter(Boolean);
        }
        if (entries.length) {
          this._presetManifest = entries;
          this._buildVibeOptions(entries);
          return;
        }
      } catch (err) {
        console.warn('[projectM] failed to load preset manifest', err);
      }
    }
    // No manifest found — show default option set.
    this._buildVibeOptions([]);
  }

  _buildVibeOptions(entries) {
    const groups = new Map();
    for (const p of entries) {
      const cat = p.split('/')[0] || 'Misc';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(p);
    }
    // Add "All" option
    const sel = this._vibeSelect;
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '__all__';
    optAll.textContent = 'All (manifest)';
    sel.appendChild(optAll);
    for (const [cat] of groups) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      localStorage.setItem('gamedude.vibe', sel.value);
    });
    const saved = localStorage.getItem('gamedude.vibe');
    if (saved && [...sel.options].some((opt) => opt.value === saved)) {
      sel.value = saved;
    } else {
      sel.value = '__all__';
    }
    sel.disabled = false;
  }

  async _shufflePreset() {
    if (!this._module) return;
    if (this._presetManifest && this._presetManifest.length) {
      const vibe = this._vibeSelect?.value ?? '__all__';
      let candidates = this._presetManifest;
      if (vibe && vibe !== '__all__') {
        candidates = candidates.filter((p) => p.startsWith(vibe + '/'));
      }
      if (!candidates.length) candidates = this._presetManifest;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      await this._selectPresetByPath(pick);
    } else {
      // Fallback: advance a random number of steps
      const count = this._module.ccall('pm_get_preset_count', 'number', [], []);
      if (!count) return;
      const steps = Math.floor(Math.random() * Math.min(20, count));
      for (let i = 0; i < steps; i++) {
        this._module.ccall('pm_next_preset', null, [], []);
      }
      this._updatePresetLabel();
    }
  }

  async _selectPresetByPath(relPath) {
    if (!this._module) return;
    try {
      const count = this._module.ccall('pm_get_preset_count', 'number', [], []);
      if (!count) return;
      // Try to find exact match by comparing trailing segments
      const normalized = relPath.replace(/^\/+/, '');
      for (let i = 0; i < count; i++) {
        const path = this._module.ccall('pm_get_preset_path', 'string', ['number'], [i]);
        if (!path) continue;
        if (path.endsWith(normalized) || path.includes('/' + normalized)) {
          // compute delta from current index
          const cur = this._module.ccall('pm_get_preset_index', 'number', [], []);
          let delta = i - cur;
          // choose shortest direction
          if (Math.abs(delta) > count / 2) {
            if (delta > 0) delta = delta - count;
            else delta = delta + count;
          }
          const fn = delta >= 0 ? 'pm_next_preset' : 'pm_prev_preset';
          const steps = Math.abs(delta);
          for (let s = 0; s < steps; s++) {
            this._module.ccall(fn, null, [], []);
          }
          this._updatePresetLabel();
          return;
        }
      }
      // Not found — try brute force rotations up to count
      for (let i = 0; i < count; i++) {
        const path = this._module.ccall('pm_get_preset_path', 'string', ['number'], [i]);
        if (path && path.includes(normalized)) {
          // rotate to that index (naive)
          const cur = this._module.ccall('pm_get_preset_index', 'number', [], []);
          while (this._module.ccall('pm_get_preset_index', 'number', [], []) !== i) {
            this._module.ccall('pm_next_preset', null, [], []);
          }
          this._updatePresetLabel();
          return;
        }
      }
    } catch (err) {
      console.warn('[projectM] _selectPresetByPath failed', err);
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
      this._statusEl.textContent = 'Loading Milkdrop visualizer…';
      this.hostEl.appendChild(this._statusEl);
    }
  }

  _hostSize() {
    const w = Math.max(1, Math.round(this.hostEl.clientWidth || window.innerWidth));
    const h = Math.max(1, Math.round(this.hostEl.clientHeight || window.innerHeight));
    return { w, h };
  }

  async _loadModule() {
    this._applyEnabledState();
    if (this._statusEl) {
      this._statusEl.textContent = 'Loading Milkdrop visualizer…';
    }

    const canvas = this._getOrCreateCanvas();
    const { w, h } = this._hostSize();

    try {
      const factory = await resolveProjectMFactory();
      this._module = await factory({
        canvas,
        locateFile: (path) => new URL(path, this._wasmBase).href,
        // Emscripten .data lookup uses page path unless scriptDirectory is set (GitHub Pages subpaths).
        scriptDirectory: this._wasmBase,
        mainScriptUrlOrBlob: this._scriptUrl,
        print: (text) => console.log('[projectM]', text),
        printErr: (text) => console.error('[projectM]', text),
      });

      const ok = this._module.ccall('pm_init', 'number', ['number', 'number'], [w, h]);
      if (!ok) {
        throw new Error('projectM failed to initialize (SDL/WebGL). Check the browser console.');
      }

      this._ready = true;
      // Keep preset changes fully user-driven. Avoid auto switch collisions while browsing.
      this._module.ccall('pm_set_preset_locked', null, ['number'], [1]);
      // Gate beat-driven preset cycling at the bridge layer (prevents rapid flicker).
      try {
        this._module.ccall('pm_set_auto_preset_switch_enabled', null, ['number'], [0]);

        const presetCount = this._module.ccall('pm_get_preset_count', 'number', [], []);
        const presetIndex = this._module.ccall('pm_get_preset_index', 'number', [], []);
        console.log(`[projectM] presets loaded: ${presetCount}, current=${presetIndex}`);
        for (let i = 0; i < presetCount; i++) {
          const path = this._module.ccall('pm_get_preset_path', 'string', ['number'], [i]);
          console.log(`[projectM] preset[${i}]=${path}`);
        }
      } catch {
        /* non-fatal: introspection may fail if functions are missing */
      }
      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
      this._setPresetButtonsDisabled(false);
      this._updatePresetLabel();
      if (this.enabled && this.audioActive) {
        this._startLoop();
      }
    } catch (err) {
      const msg =
        err?.message?.includes('fetch') || err?.message?.includes('wasm')
          ? `Could not load visualizer (${err.message}). Ensure public/vendor/projectm/ exists.`
          : err?.message || String(err);
      this._setError(msg);
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
    // Do not assign canvas.width/height here — SDL owns the WebGL backing store after pm_init.
    return canvas;
  }

  _resize() {
    if (!this._module || !this._ready) return;
    const { w, h } = this._hostSize();
    this._module.ccall('pm_resize', null, ['number', 'number'], [w, h]);
  }

  _startLoop() {
    if (this._raf || !this._module) return;

    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (!this.enabled || !this._ready) return;
      try {
        this._module.ccall('pm_render_frame', null, [], []);
      } catch (err) {
        this._stopLoop();
        this._setError(err?.message || 'Render failed');
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _friendlyPresetName(path) {
    if (!path) return 'Unknown';
    const base = path.split('/').pop() ?? path;
    const match = base.match(/^preset_\d{3}_(.+)\.milk$/i);
    return match ? match[1] : base.replace(/\.milk$/i, '');
  }

  _updatePresetLabel() {
    if (!this._presetLabelEl || !this._module) return;
    try {
      const count = this._module.ccall('pm_get_preset_count', 'number', [], []);
      const index = this._module.ccall('pm_get_preset_index', 'number', [], []);
      const path = this._module.ccall('pm_get_preset_path', 'string', ['number'], [index]);
      const name = this._friendlyPresetName(path);
      const slot = count > 0 ? `${index + 1}/${count}` : '—';
      this._presetLabelEl.textContent = `Preset ${slot}: ${name}`;
    } catch {
      this._presetLabelEl.textContent = 'Preset —';
    }
  }

  _changePreset(direction) {
    if (!this._module || !this._ready || !this.enabled) return;
    const now = performance.now();
    const elapsed = now - this._presetLastSwitchMs;
    if (this._presetBusy || elapsed < PRESET_MIN_INTERVAL_MS) {
      this._presetQueueDir = direction;
      if (!this._presetBusy && !this._presetUnlockTimer) {
        const waitMs = Math.max(PRESET_DEFER_FLOOR_MS, PRESET_MIN_INTERVAL_MS - elapsed);
        this._presetUnlockTimer = setTimeout(() => {
          this._presetUnlockTimer = null;
          if (!this.enabled) return;
          const queuedDir = this._presetQueueDir;
          this._presetQueueDir = 0;
          if (queuedDir !== 0) {
            this._changePreset(queuedDir);
          }
        }, waitMs);
      }
      return;
    }
    this._presetLastSwitchMs = now;

    this._presetBusy = true;
    this._setPresetButtonsDisabled(true);

    // Prevent preset load/render re-entrancy: pause rendering during the switch.
    const shouldResume = this.enabled && this._ready && this.audioActive;
    this._stopLoop();
    try {
      const fn = direction < 0 ? 'pm_prev_preset' : 'pm_next_preset';
      this._module.ccall(fn, null, [], []);
    } catch (err) {
      this._setError(err?.message || 'Preset switch failed');
    } finally {
      if (this._presetUnlockTimer) {
        clearTimeout(this._presetUnlockTimer);
      }
      this._presetUnlockTimer = setTimeout(() => {
        this._presetUnlockTimer = null;
        this._presetBusy = false;
        this._setPresetButtonsDisabled(!this.enabled);
        this._updatePresetLabel();
        if (!this.enabled) return;

        // Allow one settle frame before resuming the render loop.
        if (shouldResume) {
          requestAnimationFrame(() => {
            try {
              this._module?.ccall('pm_render_frame', null, [], []);
            } catch {
              /* ignore */
            }
            this._startLoop();
          });
        }
        if (this._presetQueueDir !== 0) {
          const queuedDir = this._presetQueueDir;
          this._presetQueueDir = 0;
          this._changePreset(queuedDir);
        }
      }, PRESET_UNLOCK_DELAY_MS);
    }
  }

  _setPresetButtonsDisabled(disabled) {
    for (const btn of this._presetButtons) {
      btn.disabled = disabled;
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
    const mod = this._module;
    if (!mod || !interleaved.length) return;
    const byteLen = interleaved.length * 4;
    const ptr = this._ensurePcmBuffer(byteLen);
    if (!ptr) return;
    mod.HEAPF32.set(interleaved, ptr >> 2);
    mod.ccall(
      'pm_feed_pcm',
      null,
      ['number', 'number', 'number'],
      [ptr, samplesPerChannel, 2],
    );

    // Basic beat detection: RMS energy burst triggers auto-shuffle when enabled.
    try {
      if (this._autoShuffle) {
        let sum = 0;
        for (let i = 0; i < interleaved.length; i++) {
          const v = interleaved[i];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / interleaved.length);
        this._rmsHistory.push(rms);
        if (this._rmsHistory.length > 8) this._rmsHistory.shift();
        const mean = this._rmsHistory.reduce((a, b) => a + b, 0) / this._rmsHistory.length;
        const now = performance.now();
        if (mean > 0 && rms > mean * 2.0 && now - this._lastBeatMs > 420) {
          this._lastBeatMs = now;
          this._shufflePreset();
        }
      }
    } catch (err) {
      /* non-fatal */
    }
  }
}
