import { Howl } from 'howler';

const MANIFEST_URL = './demos/manifest.json';
const FALLBACK_MANIFEST_URL = './public/demos/manifest.json';

function humanizeFilename(stem) {
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isWavFile(file) {
  if (!file) return false;
  const name = file.name?.toLowerCase() ?? '';
  if (name.endsWith('.wav')) return true;
  const type = file.type?.toLowerCase() ?? '';
  return type === 'audio/wav' || type === 'audio/x-wav' || type === 'audio/wave';
}

export class WavCatalog {
  constructor() {
    this.manifestTracks = [];
    this.localTracks = [];
    this.currentHowl = null;
    this.currentIndex = -1;
    this.onEnd = null;
    this.onProgress = null;
    this.onPlayStateChange = null;
    this.audioTap = null;
    this._progressTimer = null;
  }

  get tracks() {
    return [...this.localTracks, ...this.manifestTracks];
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
    this.manifestTracks = data?.tracks ?? [];
    return this.tracks;
  }

  addLocalFile(file) {
    if (!isWavFile(file)) return -1;

    const objectUrl = URL.createObjectURL(file);
    const stem = file.name.replace(/\.wav$/i, '');
    this.localTracks.unshift({
      id: `local-${Date.now()}-${stem}`,
      title: humanizeFilename(stem),
      url: objectUrl,
      local: true,
    });
    return 0;
  }

  clearLocalTracks() {
    for (const track of this.localTracks) {
      URL.revokeObjectURL(track.url);
    }
    this.localTracks = [];
  }

  play(index) {
    this.stop(false);
    const track = this.tracks[index];
    if (!track?.url) return false;

    this.currentIndex = index;
    this.currentHowl = new Howl({
      src: [track.url],
      // Web Audio path enables AnalyserNode tap (loads full WAV into memory).
      html5: false,
      volume: Howler.volume(),
      onplay: () => {
        this.audioTap?.start();
        this.onPlayStateChange?.(true);
      },
      onend: () => {
        this._handlePlaybackEnd();
      },
      onloaderror: () => {
        this._handlePlaybackEnd();
      },
      onplayerror: () => {
        this._handlePlaybackEnd();
      },
      onstop: () => {
        this.audioTap?.stop();
        this.onPlayStateChange?.(false);
      },
    });

    this.currentHowl.play();
    this._progressTimer = setInterval(() => {
      if (!this.currentHowl?.playing()) return;
      const elapsed = this.currentHowl.seek() || 0;
      const duration = this.currentHowl.duration() || 0;
      this.onProgress?.(elapsed, duration);
    }, 250);
    return true;
  }

  seekBy(deltaSeconds) {
    if (!this.currentHowl?.playing()) return false;
    const duration = this.currentHowl.duration() || 0;
    if (duration <= 0) return false;
    const current = this.currentHowl.seek() || 0;
    const next = Math.max(0, Math.min(duration, current + deltaSeconds));
    this.currentHowl.seek(next);
    this.onProgress?.(next, duration);
    return true;
  }

  stop(fireEnd = true) {
    this._clearProgress();
    if (this.currentHowl) {
      this.audioTap?.stop();
      this.onPlayStateChange?.(false);
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
    if (this.currentIndex < 0) return null;
    return this.tracks[this.currentIndex] ?? null;
  }

  playLocalFile(file) {
    const index = this.addLocalFile(file);
    if (index < 0) return false;
    return this.play(index);
  }

  _handlePlaybackEnd() {
    this._clearProgress();
    this.audioTap?.stop();
    this.onPlayStateChange?.(false);
    this.currentHowl = null;
    this.currentIndex = -1;
    this.onEnd?.();
  }

  _clearProgress() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }
}

export { humanizeFilename };
