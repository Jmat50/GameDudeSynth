export class UnderConstructionScene {
  constructor() {
    this._container = null;
    this._root = null;
    this._metrics = { rms: 0, bass: 0, mid: 0, treble: 0 };
  }

  start(container) {
    this.stop();
    this._container = container;

    container.innerHTML = `
      <div class="under-construction-scene">
        <div class="uc-banner top blink">Under Construction</div>
        <div class="uc-banner mid blink">Coming Soon!</div>
        <div class="uc-banner bottom blink">Best Viewed in Netscape</div>
        <div class="uc-gif-tile a" aria-hidden="true"></div>
        <div class="uc-gif-tile b" aria-hidden="true"></div>
        <div class="uc-gif-tile c" aria-hidden="true"></div>
      </div>
    `;

    this._root = container.querySelector('.under-construction-scene');
  }

  stop() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._root = null;
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { rms: 0, bass: 0, mid: 0, treble: 0 };
    if (!this._root) return;
    this._root.style.setProperty('--audio-mid', String(this._metrics.mid));
    this._root.style.setProperty('--audio-treble', String(this._metrics.treble));
    this._root.dataset.audioReactive = 'true';
    const opacity = 0.7 + this._metrics.mid * 0.3;
    for (const banner of this._root.querySelectorAll('.uc-banner')) {
      banner.style.opacity = String(opacity);
    }
  }
}
