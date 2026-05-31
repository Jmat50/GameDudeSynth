export class FlyingToastersRenderer {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._toasters = [];
    this._stars = [];
    this._raf = null;
    this._metrics = { rms: 0, bass: 0, mid: 0, treble: 0 };
    this._onResize = () => this._resize();
  }

  start(canvas) {
    this.stop();
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._onResize);
    this._initToasters();
    this._initStars();
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
    this._toasters = [];
    this._stars = [];
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { rms: 0, bass: 0, mid: 0, treble: 0 };
    const target = Math.min(16, 6 + Math.floor(this._metrics.treble * 10 + this._metrics.rms * 4));
    while (this._toasters.length < target && this._canvas) {
      this._toasters.push(this._spawnToaster());
    }
    while (this._toasters.length > target) {
      this._toasters.pop();
    }
  }

  _resize() {
    if (!this._canvas) return;
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
    if (this._toasters.length === 0) this._initToasters();
    if (this._stars.length === 0) this._initStars();
  }

  _spawnToaster() {
    const w = this._canvas?.width ?? 800;
    const h = this._canvas?.height ?? 600;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      speed: Math.random() * 2 + 1,
      direction: Math.random() * Math.PI * 2,
      size: Math.random() * 20 + 20,
    };
  }

  _initToasters() {
    const count = 8;
    this._toasters = Array.from({ length: count }, () => this._spawnToaster());
  }

  _initStars() {
    const w = this._canvas?.width ?? 800;
    const h = this._canvas?.height ?? 600;
    this._stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  _loop() {
    const canvas = this._canvas;
    const ctx = this._ctx;
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#000014';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const t = Date.now() / 1000;
    for (const star of this._stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + star.phase));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(star.x, star.y, 2, 2);
    }

    const speedMul = 1 + this._metrics.treble * 1.5 + this._metrics.rms * 0.5;

    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const toaster of this._toasters) {
      let nx = toaster.x + Math.cos(toaster.direction) * toaster.speed * speedMul;
      let ny = toaster.y + Math.sin(toaster.direction) * toaster.speed * speedMul;

      if (nx < 0 || nx > canvas.width - toaster.size) {
        toaster.direction = Math.PI - toaster.direction;
        nx = Math.max(0, Math.min(canvas.width - toaster.size, nx));
      }
      if (ny < 0 || ny > canvas.height - toaster.size) {
        toaster.direction = -toaster.direction;
        ny = Math.max(0, Math.min(canvas.height - toaster.size, ny));
      }

      toaster.x = nx;
      toaster.y = ny;

      ctx.fillText('🍞', nx + toaster.size / 2, ny + toaster.size / 2);
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }
}
