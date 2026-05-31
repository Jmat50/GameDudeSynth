export class CrtOverlay {
  constructor({ standalone = false } = {}) {
    this.standalone = standalone;
    this._container = null;
    this._active = false;
    this._metrics = { rms: 0, bass: 0, mid: 0, treble: 0 };
  }

  start(container) {
    this.stop();
    this._container = container;
    this._active = true;

    if (this.standalone) {
      container.classList.add('crt-standalone');
    }

    container.innerHTML = `
      <div class="crt-flicker-enhanced" aria-hidden="true"></div>
      <div class="crt-scanlines-enhanced" aria-hidden="true"></div>
    `;
    container.dataset.audioReactive = 'true';
    this.setMetrics(this._metrics);
  }

  stop() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container.classList.remove('crt-standalone');
      this._container.dataset.audioReactive = 'false';
      this._container = null;
    }
    this._active = false;
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { rms: 0, bass: 0, mid: 0, treble: 0 };
    if (!this._container) return;
    this._container.style.setProperty('--audio-rms', String(this._metrics.rms));
    this._container.style.setProperty('--audio-mid', String(this._metrics.mid));
  }
}
