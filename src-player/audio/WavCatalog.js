import { Howl } from 'howler';

const MANIFEST_URL = '/demos/manifest.json';
const FALLBACK_MANIFEST_URL = '/public/demos/manifest.json';

function humanizeFilename(stem) {
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export class WavCatalog {
  constructor() {
    this.tracks = [];
    this.currentHowl = null;
    this.currentIndex = -1;
    this.onEnd = null;
    this.onProgress = null;
    this._progressTimer = null;
    this._startedAt = 0;
  }

  async loadManifest() {
    let data = null;
    for (const url of [MANIFEST_URL, FALLBACK_MANIFEST_URL]) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          break;
        }
      } catch {
        /* try next */
      }
    }
    this.tracks = data?.tracks ?? [];
    return this.tracks;
  }

  play(index) {
    this.stop(false);
    const track = this.tracks[index];
    if (!track?.url) return false;

    this.currentIndex = index;
    this.currentHowl = new Howl({
      src: [track.url],
      html5: true,
      volume: Howler.volume(),
      onend: () => {
        this._clearProgress();
        this.currentHowl = null;
        this.currentIndex = -1;
        this.onEnd?.();
      },
      onloaderror: () => {
        this._clearProgress();
        this.onEnd?.();
      },
      onplayerror: () => {
        this._clearProgress();
        this.onEnd?.();
      },
    });

    this.currentHowl.play();
    this._startedAt = performance.now();
    this._progressTimer = setInterval(() => {
      if (!this.currentHowl?.playing()) return;
      const elapsed = (performance.now() - this._startedAt) / 1000;
      const duration = this.currentHowl.duration() || 0;
      this.onProgress?.(elapsed, duration);
    }, 250);
    return true;
  }

  stop(fireEnd = true) {
    this._clearProgress();
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.currentHowl.unload();
      this.currentHowl = null;
    }
    this.currentIndex = -1;
    if (fireEnd) this.onEnd?.();
  }

  isPlaying() {
    return !!this.currentHowl?.playing();
  }

  getCurrentTrack() {
    return this.currentIndex >= 0 ? this.tracks[this.currentIndex] : null;
  }

  _clearProgress() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }
}

export { humanizeFilename };
