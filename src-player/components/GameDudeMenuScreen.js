import { LitElement, html, css } from 'lit';
import { WavCatalog } from '../audio/WavCatalog.js';

export class GameDudeMenuScreen extends LitElement {
  static properties = {
    start: { type: Boolean },
    scene: { type: String },
    cursor: { type: Number },
    tracks: { type: Array },
    statusText: { type: String },
    elapsed: { type: Number },
    duration: { type: Number },
    loading: { type: Boolean },
  };

  constructor() {
    super();
    this.start = false;
    this.scene = 'off';
    this.cursor = 0;
    this.tracks = [];
    this.statusText = '';
    this.elapsed = 0;
    this.duration = 0;
    this.loading = false;
    this.catalog = new WavCatalog();
    this._bootTimer = null;
    this._blinkTimer = null;
    this._pendingDrop = null;
    this.showBlink = true;

    this.catalog.onEnd = () => this._returnToMenu();
    this.catalog.onProgress = (elapsed, duration) => {
      this.elapsed = elapsed;
      this.duration = duration;
    };
  }

  updated(changed) {
    if (changed.has('start')) {
      if (this.start) this.powerOn();
      else this.powerOff();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();
    this.catalog.stop(false);
  }

  powerOn() {
    this.scene = 'boot';
    this.statusText = 'GAMEDUDESYNTH';
    this.loading = true;
    this._clearTimers();
    this._bootTimer = setTimeout(async () => {
      const tracks = await this.catalog.loadManifest();
      this.tracks = tracks;
      this.loading = false;
      this.cursor = 0;
      this.scene = tracks.length > 0 ? 'menu' : 'empty';
      if (tracks.length === 0) {
        this.statusText = 'NO TRACKS';
      }
      if (this._pendingDrop) {
        const file = this._pendingDrop;
        this._pendingDrop = null;
        this.handleDroppedFile(file);
      }
    }, 1200);
    this._blinkTimer = setInterval(() => {
      this.showBlink = !this.showBlink;
      this.requestUpdate();
    }, 500);
  }

  powerOff() {
    this._clearTimers();
    this._pendingDrop = null;
    this.catalog.stop(false);
    this.catalog.clearLocalTracks();
    this.scene = 'off';
    this.tracks = [];
    this.cursor = 0;
    this.statusText = '';
  }

  handleDroppedFile(file) {
    if (this.loading || this.scene === 'boot') {
      this._pendingDrop = file;
      return true;
    }

    const ok = this.catalog.playLocalFile(file);
    if (!ok) return false;

    this.tracks = this.catalog.tracks;
    this.cursor = 0;
    this.scene = 'playing';
    this.elapsed = 0;
    this.duration = 0;
    return true;
  }

  handleInput(detail) {
    if (!this.start || this.loading) return;
    const action = detail.action ?? detail;

    if (action === 'dpad') {
      if (this.scene === 'playing') {
        if (detail.direction === 'right') {
          this.catalog.seekBy(15);
        } else if (detail.direction === 'left') {
          this.catalog.seekBy(-15);
        }
        return;
      }
      if (this.scene === 'menu' && this.tracks.length > 0) {
        if (detail.direction === 'up') {
          this.cursor = (this.cursor - 1 + this.tracks.length) % this.tracks.length;
        } else if (detail.direction === 'down') {
          this.cursor = (this.cursor + 1) % this.tracks.length;
        }
      }
      return;
    }

    if (action === 'a' || action === 'start') {
      if (this.scene === 'menu' && this.tracks.length > 0) {
        this._playCurrent();
      } else if (this.scene === 'playing') {
        this.catalog.togglePause();
        this.requestUpdate();
      }
      return;
    }

    if (action === 'b' || action === 'select') {
      if (this.scene === 'playing') {
        this.catalog.stop();
      }
    }
  }

  _playCurrent() {
    const ok = this.catalog.play(this.cursor);
    if (ok) {
      this.scene = 'playing';
      this.elapsed = 0;
      this.duration = 0;
    }
  }

  _returnToMenu() {
    this.scene = this.tracks.length > 0 ? 'menu' : 'empty';
    this.elapsed = 0;
    this.duration = 0;
  }

  _clearTimers() {
    if (this._bootTimer) {
      clearTimeout(this._bootTimer);
      this._bootTimer = null;
    }
    if (this._blinkTimer) {
      clearInterval(this._blinkTimer);
      this._blinkTimer = null;
    }
  }

  _formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 168px;
      background: #9ca04c;
      box-shadow:
        5px 5px 10px rgba(0, 0, 0, 0.5) inset,
        -2px -2px 10px rgba(0, 0, 0, 0.25) inset;
      overflow: hidden;
      position: relative;
      font-family: 'Press Start 2P', monospace;
      color: #0f380f;
      box-sizing: border-box;
    }
    .viewport {
      width: 100%;
      height: 100%;
      padding: 8px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .title {
      font-size: 10px;
      letter-spacing: -1px;
      margin-bottom: 8px;
      text-align: center;
    }
    .rule {
      height: 2px;
      background: #306230;
      margin-bottom: 8px;
    }
    .menu-list {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .menu-item {
      font-size: 8px;
      line-height: 1.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.85;
    }
    .menu-item.active {
      opacity: 1;
    }
    .menu-item.active::before {
      content: '► ';
    }
    .boot-text {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      animation: bootScroll 1.2s linear forwards;
    }
    @keyframes bootScroll {
      0% { transform: translateY(-80px); opacity: 0; }
      40% { opacity: 1; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .playing {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .playing .track-name {
      font-size: 8px;
      line-height: 1.6;
      text-align: center;
    }
    .playing .now {
      font-size: 8px;
      text-align: center;
    }
    .playing .now.blink-hidden { opacity: 0; }
    .playing .time {
      font-size: 7px;
      text-align: center;
      color: #306230;
    }
    .progress {
      height: 6px;
      background: #306230;
      border: 1px solid #0f380f;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: #0f380f;
      width: 0%;
      transition: width 0.2s linear;
    }
    .hint, .empty {
      font-size: 7px;
      line-height: 1.6;
      text-align: center;
      opacity: 0.9;
    }
  `;

  render() {
    if (this.scene === 'off') {
      return html`<div class="viewport blank"></div>`;
    }

    if (this.scene === 'boot') {
      return html`
        <div class="viewport">
          <div class="boot-text">GAMEDUDESYNTH</div>
        </div>
      `;
    }

    if (this.scene === 'empty') {
      return html`
        <div class="viewport">
          <div class="title">GAMEDUDESYNTH</div>
          <div class="rule"></div>
          <div class="empty">
            DRAG .WAV HERE<br />
            TO PLAY
          </div>
        </div>
      `;
    }

    if (this.scene === 'playing') {
      const track = this.catalog.getCurrentTrack();
      const pct = this.duration > 0 ? Math.min(100, (this.elapsed / this.duration) * 100) : 0;
      const isPaused = this.catalog.isPaused();
      return html`
        <div class="viewport">
          <div class="title">NOW PLAYING</div>
          <div class="rule"></div>
          <div class="playing">
            <div class="track-name">${track?.title ?? 'Unknown'}</div>
            <div class="now ${this.showBlink || isPaused ? '' : 'blink-hidden'}">${isPaused ? '॥ PAUSED' : '♪ PLAYING'}</div>
            <div class="time">${this._formatTime(this.elapsed)} / ${this._formatTime(this.duration)}</div>
            <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="hint">A/START = PAUSE/RESUME · B = STOP · ← -15s · → +15s</div>
          </div>
        </div>
      `;
    }

    const visible = this.tracks.slice(
      Math.max(0, this.cursor - 2),
      Math.min(this.tracks.length, this.cursor + 4)
    );
    const offset = Math.max(0, this.cursor - 2);

    return html`
      <div class="viewport">
        <div class="title">GAMEDUDESYNTH</div>
        <div class="rule"></div>
        <div class="menu-list">
          ${visible.map((track, i) => html`
            <div class="menu-item ${offset + i === this.cursor ? 'active' : ''}">
              ${track.title}
            </div>
          `)}
        </div>
        <div class="hint">A/START PLAY · B STOP · DROP WAV</div>
      </div>
    `;
  }
}

customElements.define('game-dude-menu-screen', GameDudeMenuScreen);
