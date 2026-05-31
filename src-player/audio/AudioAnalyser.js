import { Howler } from 'howler';

const IDLE_METRICS = { rms: 0, bass: 0, mid: 0, treble: 0 };

export class AudioAnalyser {
  constructor() {
    this.onFrame = null;
    this._analyser = null;
    this._data = null;
    this._raf = null;
    this._wired = false;
  }

  attach(_howl) {
    this._ensureGraph();
  }

  start() {
    this._ensureGraph();
    if (this._raf || !this._analyser) return;

    const tick = () => {
      if (!this._analyser || !this._data) return;
      this._analyser.getByteFrequencyData(this._data);
      this.onFrame?.(this._computeBands(this._data));
      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this.onFrame?.(IDLE_METRICS);
  }

  _ensureGraph() {
    const ctx = Howler.ctx;
    if (!ctx) return;

    if (!this._analyser) {
      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = 0.75;
      this._data = new Uint8Array(this._analyser.frequencyBinCount);
    }

    if (!this._wired && Howler.masterGain) {
      try {
        Howler.masterGain.disconnect();
      } catch {
        /* already disconnected */
      }
      Howler.masterGain.connect(this._analyser);
      this._analyser.connect(ctx.destination);
      this._wired = true;
    }
  }

  _computeBands(data) {
    const len = data.length;
    if (!len) return IDLE_METRICS;

    let sum = 0;
    for (let i = 0; i < len; i++) sum += data[i];
    const rms = sum / (len * 255);

    const sampleRate = Howler.ctx?.sampleRate ?? 44100;
    const binHz = sampleRate / this._analyser.fftSize;
    const bassEnd = Math.max(1, Math.min(len, Math.floor(150 / binHz)));
    const midEnd = Math.max(bassEnd + 1, Math.min(len, Math.floor(2000 / binHz)));

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < bassEnd; i++) bassSum += data[i];
    for (let i = bassEnd; i < midEnd; i++) midSum += data[i];
    for (let i = midEnd; i < len; i++) trebleSum += data[i];

    return {
      rms,
      bass: bassSum / (bassEnd * 255),
      mid: midSum / ((midEnd - bassEnd) * 255),
      treble: trebleSum / ((len - midEnd) * 255),
    };
  }
}
