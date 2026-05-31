const STORAGE_ENABLED = 'gamedude.vizEnabled';
const STORAGE_OPACITY = 'gamedude.vizOpacity';

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
    this._module = null;
    this._raf = null;
    this._resizeObserver = null;
    this._statusEl = null;
    this._error = null;
    this._ready = false;
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
    if (this.enabled && this._ready) {
      this._startLoop();
    } else if (!this.enabled) {
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
      this._startLoop();
    }
  }

  disable() {
    this.enabled = false;
    localStorage.setItem(STORAGE_ENABLED, 'false');
    this.hostEl.classList.add('is-disabled');
    this._stopLoop();
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
    prevBtn.addEventListener('click', () => this._module?.ccall('pm_prev_preset', null, [], []));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'viz-btn';
    nextBtn.textContent = 'Preset ▶';
    nextBtn.addEventListener('click', () => this._module?.ccall('pm_next_preset', null, [], []));

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
      if (this._statusEl) {
        this._statusEl.remove();
        this._statusEl = null;
      }

      this._resize();
      if (this.enabled) {
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

  _feedPcm(interleaved, samplesPerChannel) {
    const mod = this._module;
    const byteLen = interleaved.length * 4;
    const ptr = mod._malloc(byteLen);
    mod.HEAPF32.set(interleaved, ptr >> 2);
    mod.ccall(
      'pm_feed_pcm',
      null,
      ['number', 'number', 'number'],
      [ptr, samplesPerChannel, 2],
    );
    mod._free(ptr);
  }
}
