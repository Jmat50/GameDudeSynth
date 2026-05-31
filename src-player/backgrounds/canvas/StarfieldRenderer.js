const STAR_COLORS = ['#ffffff', '#ffff99', '#99ccff', '#ff9999'];

export class StarfieldRenderer {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._stars = [];
    this._raf = null;
    this._warpSpeed = 1;
    this._metrics = { bass: 0, mid: 0, treble: 0, rms: 0 };
    this._onResize = () => this._resize();
  }

  start(canvas) {
    this.stop();
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._onResize);
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
    this._stars = [];
  }

  setMetrics(metrics) {
    this._metrics = metrics ?? { bass: 0, mid: 0, treble: 0, rms: 0 };
    this._warpSpeed = 1 + this._metrics.bass * 2.5 + this._metrics.rms * 0.5;
  }

  _resize() {
    if (!this._canvas) return;
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
    if (this._stars.length) this._initStars();
  }

  _initStars() {
    const canvas = this._canvas;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numStars = 600;

    this._stars = Array.from({ length: numStars }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 1000;
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        z: Math.random() * 1000,
        prevX: 0,
        prevY: 0,
        speed: Math.random() * 2 + 0.5,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        size: Math.random() * 2 + 1,
      };
    });
  }

  _loop() {
    const canvas = this._canvas;
    const ctx = this._ctx;
    if (!canvas || !ctx) return;

    ctx.fillStyle = `rgba(0, 0, 20, ${0.08 + this._metrics.rms * 0.06})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const warp = this._warpSpeed;

    for (const star of this._stars) {
      star.prevX = star.x;
      star.prevY = star.y;
      star.z -= star.speed * warp;

      if (star.z <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 1000;
        star.x = centerX + Math.cos(angle) * distance;
        star.y = centerY + Math.sin(angle) * distance;
        star.z = 1000;
        star.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      }

      const screenX = (star.x - centerX) * (200 / star.z) + centerX;
      const screenY = (star.y - centerY) * (200 / star.z) + centerY;
      const prevScreenX =
        (star.prevX - centerX) * (200 / (star.z + star.speed * warp)) + centerX;
      const prevScreenY =
        (star.prevY - centerY) * (200 / (star.z + star.speed * warp)) + centerY;

      if (screenX < 0 || screenX > canvas.width || screenY < 0 || screenY > canvas.height) {
        continue;
      }

      const size = (1 - star.z / 1000) * star.size * 3;
      const opacity = Math.max(0, 1 - star.z / 1000);

      if (warp > 1.5) {
        ctx.strokeStyle = `${star.color}${Math.floor(opacity * 100)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.lineWidth = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(prevScreenX, prevScreenY);
        ctx.lineTo(screenX, screenY);
        ctx.stroke();
      }

      ctx.fillStyle = `${star.color}${Math.floor(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }
}
