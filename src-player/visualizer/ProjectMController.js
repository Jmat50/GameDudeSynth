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
    this._wasmBase = vendorBaseUrl();
    this._scriptUrl = new URL('projectm.js', this._wasmBase).href;

    document.documentElement.style.setProperty('--viz-opacity', String(this.opacity));
    this._buildControls();
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
    presetRow.append(prevBtn, nextBtn);

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

    this.controlsEl.append(toggleWrap, presetRow, opacityRow, this._errorEl);

    if (this.enabled) {
      this.enable().catch((err) => this._setError(err.message));
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
      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
      this._setPresetButtonsDisabled(false);
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
        if (!this.enabled) return;
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
  }
}
