const AUTHENTIC_ERRORS = [
  {
    code: '0E',
    address: '0028:C001E36',
    module: 'VXD VMM(01)',
    offset: '00010E36',
    description: 'FATAL EXCEPTION: General Protection Fault',
  },
  {
    code: '0D',
    address: '0028:C0025F42',
    module: 'VXD VWIN32(01)',
    offset: '00005F42',
    description: 'FATAL EXCEPTION: Stack Fault',
  },
  {
    code: '06',
    address: '0028:C002A1B8',
    module: 'VXD SHELL(01)',
    offset: '0000A1B8',
    description: 'FATAL EXCEPTION: Invalid Opcode',
  },
  {
    code: '0C',
    address: '0028:C0031D74',
    module: 'VXD KERNEL32(01)',
    offset: '00001D74',
    description: 'FATAL EXCEPTION: Stack Overflow',
  },
];

const CRASH_REASONS = [
  'User clicked suspicious popup advertisement',
  "Attempted to download 'FREE_SCREENSAVER.EXE'",
  "Opened email attachment 'ILOVEYOU.VBS'",
  'Installed Bonzi Buddy without reading EULA',
  "Clicked 'You are visitor #1,000,000!'",
];

const SYSTEM_SPECS = [
  'Intel Pentium 133 MHz',
  '16 MB RAM (8 MB available)',
  '1.2 GB Hard Drive (98% full)',
  'Creative Sound Blaster 16',
  'Diamond Stealth 64 Video (2MB)',
  'US Robotics 56K Sportster Modem',
];

let _beepPlayed = false;

function playCrashSound() {
  if (_beepPlayed) return;
  _beepPlayed = true;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.frequency.value = 200;
    osc2.frequency.value = 150;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    /* optional */
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class BsodScene {
  constructor() {
    this._container = null;
    this._cursorEl = null;
    this._screenEl = null;
    this._cursorTimer = null;
    this._metrics = { rms: 0, bass: 0, mid: 0, treble: 0 };
    this._showCursor = true;
  }

  start(container) {
    this.stop();
    playCrashSound();
    this._container = container;

    const err = pickRandom(AUTHENTIC_ERRORS);
    const reason = pickRandom(CRASH_REASONS);
    const now = new Date();

    const body = `Microsoft Windows
Copyright (C) Microsoft Corp 1981-1998.

A fatal exception ${err.code} has occurred at ${err.address} in VXD ${err.module} +
${err.offset}. The current application will be terminated.

${err.description}

* Press any key to terminate the current application.
* Press CTRL+ALT+DEL again to restart your computer. You will
  lose any unsaved information in all open applications.

System Information:
Computer: ${SYSTEM_SPECS[0]}
Memory: ${SYSTEM_SPECS[1]}
Storage: ${SYSTEM_SPECS[2]}
Sound: ${SYSTEM_SPECS[3]}
Video: ${SYSTEM_SPECS[4]}
Modem: ${SYSTEM_SPECS[5]}

Error Details:
Cause: ${reason}
Date: ${now.toLocaleDateString('en-US')}
Time: ${now.toLocaleTimeString('en-US', { hour12: false })}

Press any key to continue...
`;

    container.innerHTML = `
      <div class="crash-screen">
        <pre class="crash-text"></pre>
        <span class="crash-cursor">█</span>
      </div>
    `;

    this._screenEl = container.querySelector('.crash-screen');
    container.querySelector('.crash-text').textContent = body;
    this._cursorEl = container.querySelector('.crash-cursor');

    const blinkMs = () => 530 / (1 + this._metrics.rms * 0.4);
    const blink = () => {
      this._showCursor = !this._showCursor;
      if (this._cursorEl) {
        this._cursorEl.style.opacity = this._showCursor ? '1' : '0';
      }
      if (this._container) {
        this._cursorTimer = setTimeout(blink, blinkMs());
      }
    };
    blink();
  }

  stop() {
    if (this._cursorTimer) {
      clearTimeout(this._cursorTimer);
      this._cursorTimer = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { rms: 0, bass: 0, mid: 0, treble: 0 };
    if (this._screenEl) {
      const jitter = this._metrics.bass * 3;
      this._screenEl.style.transform = jitter > 0.05 ? `translateX(${jitter}px)` : '';
    }
  }
}
