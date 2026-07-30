/**
 * Thin adapter around GameDudeSynthV2.GameBoyPlayer for the WAV/MIDI player UI.
 * Progressive live scheduling (play-while-generating) is handled inside playMIDI().
 */

import { humanizeFilename } from './WavCatalog.js';

function getEngine() {
  return typeof window !== 'undefined' ? window.GameDudeSynthV2 : null;
}

export class MidiLivePlayer {
  constructor() {
    this.player = null;
    this.title = '';
    this.duration = 0;
    this._paused = false;
    this._progressTimer = null;
    this._playing = false;
    this.onEnd = null;
    this.onProgress = null;
    this.onPlayStateChange = null;
  }

  isAvailable() {
    return typeof getEngine()?.GameBoyPlayer === 'function';
  }

  async play(file) {
    if (!this.isAvailable()) {
      console.error('[MidiLivePlayer] GameDudeSynthV2 is not loaded');
      return false;
    }

    this.stop(false);

    const Engine = getEngine();
    this.player = new Engine.GameBoyPlayer();
    const buffer = await file.arrayBuffer();
    const stem = file.name.replace(/\.(mid|midi)$/i, '');
    this.title = humanizeFilename(stem);

    const info = await this.player.playMIDI(buffer);
    this.duration = info?.duration ?? 0;
    this._paused = false;
    this._playing = true;
    this.onPlayStateChange?.(true);
    this._startProgress();
    return true;
  }

  stop(fireEnd = true) {
    this._clearProgress();
    const wasActive = this._playing || this._paused;
    if (this.player) {
      try {
        this.player.stop();
      } catch {
        /* ignore */
      }
      this.player = null;
    }
    this._playing = false;
    this._paused = false;
    this.duration = 0;
    this.title = '';
    if (wasActive) {
      this.onPlayStateChange?.(false);
    }
    if (fireEnd && wasActive) {
      this.onEnd?.();
    }
  }

  async pause() {
    if (!this.player || !this._playing || this._paused) return false;
    const ctx = this.player.getAPU().getAudioContext();
    if (ctx.state === 'running') {
      await ctx.suspend();
    }
    this._paused = true;
    this._playing = false;
    this.onPlayStateChange?.(false);
    return true;
  }

  async resume() {
    if (!this.player || !this._paused) return false;
    const ctx = this.player.getAPU().getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this._paused = false;
    this._playing = true;
    this.onPlayStateChange?.(true);
    return true;
  }

  async togglePause() {
    if (this.isPlaying()) return this.pause();
    if (this.isPaused()) return this.resume();
    return false;
  }

  isPlaying() {
    return this._playing && !!this.player?.getIsPlaying?.();
  }

  isPaused() {
    return this._paused;
  }

  isActive() {
    return !!this.player && (this._playing || this._paused);
  }

  getElapsed() {
    if (!this.player) return 0;
    if (this._paused) {
      // currentTime is frozen while suspended; still valid.
      return Math.max(0, this.player.getElapsedTime());
    }
    if (!this.player.getIsPlaying()) return this.duration;
    return Math.max(0, this.player.getElapsedTime());
  }

  getDuration() {
    return this.duration;
  }

  getCurrentTrack() {
    if (!this.isActive() || !this.title) return null;
    return { id: 'midi-live', title: this.title, midi: true };
  }

  getAudioContext() {
    return this.player?.getAPU()?.getAudioContext?.() ?? null;
  }

  getOutputNode() {
    return this.player?.getAPU()?.getOutputNode?.() ?? null;
  }

  _startProgress() {
    this._clearProgress();
    this._progressTimer = setInterval(() => {
      if (!this.player) return;

      const enginePlaying = this.player.getIsPlaying();
      if (!enginePlaying && !this._paused) {
        // Song completed via audio-time watcher
        this._clearProgress();
        this._playing = false;
        this._paused = false;
        const duration = this.duration;
        this.onProgress?.(duration, duration);
        this.onPlayStateChange?.(false);
        this.player = null;
        this.onEnd?.();
        return;
      }

      if (this._paused) {
        this.onProgress?.(this.getElapsed(), this.duration);
        return;
      }

      const elapsed = Math.min(this.getElapsed(), this.duration || this.getElapsed());
      this.onProgress?.(elapsed, this.duration);
    }, 250);
  }

  _clearProgress() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }
}
