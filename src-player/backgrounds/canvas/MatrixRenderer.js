const MATRIX_CHARS = [
  'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ',
  'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '!', '@', '#', '$', '%', '&', '*', '+', '=', '?',
];

function randomChar() {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
}

export class MatrixRenderer {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._columns = [];
    this._raf = null;
    this._speedMul = 1;
    this._metrics = { bass: 0, mid: 0, treble: 0, rms: 0 };
    this._onResize = () => this._resize();
  }

  start(canvas) {
    this.stop();
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._onResize);
    this._loop();
  }

  stop() {
    window.removeEventListener('resize', this._onResize);
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    if (this._ctx && this._canvas) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
    this._columns = [];
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { bass: 0, mid: 0, treble: 0, rms: 0 };
    this._speedMul = 1 + this._metrics.treble * 2 + this._metrics.rms * 0.75;
  }

  _resize() {
    if (!this._canvas) return;
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._initColumns();
  }

  _initColumns() {
    const canvas = this._canvas;
    if (!canvas) return;

    const columnWidth = 20;
    const numColumns = Math.max(1, Math.floor(canvas.width / columnWidth));

    this._columns = Array.from({ length: numColumns }, (_, i) => ({
      x: i * columnWidth,
      y: Math.random() * canvas.height,
      speed: Math.random() * 3 + 1,
      chars: Array.from({ length: 30 }, randomChar),
      opacity: Array.from({ length: 30 }, (_, j) => Math.max(0, 1 - j * 0.05)),
    }));
  }

  _loop() {
    const canvas = this._canvas;
    const ctx = this._ctx;
    if (!canvas || !ctx) return;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + this._metrics.rms * 0.03})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const speedMul = this._speedMul;

    for (const column of this._columns) {
      for (let i = 0; i < column.chars.length; i++) {
        const y = column.y + i * 20;

        if (y > canvas.height) {
          column.y = -600;
          column.speed = Math.random() * 3 + 1;
          column.chars = Array.from({ length: 30 }, randomChar);
        }

        const opacity = column.opacity[i] || 0;
        if (i === 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        } else if (i < 5) {
          ctx.fillStyle = `rgba(0, 255, 0, ${opacity})`;
        } else {
          ctx.fillStyle = `rgba(0, 150, 0, ${opacity * 0.7})`;
        }

        ctx.font = '16px Courier New, monospace';
        ctx.fillText(column.chars[i], column.x, y);

        if (Math.random() < 0.02) {
          column.chars[i] = randomChar();
        }
      }

      column.y += column.speed * speedMul;
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }
}
