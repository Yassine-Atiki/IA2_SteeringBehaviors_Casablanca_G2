class ArenaRenderer {
  constructor() { this.cache = document.createElement('canvas'); this.bounds = null; }

  resize(w, h, bounds) {
    this.bounds = bounds;
    this.cache.width = w; this.cache.height = h;
    const ctx = this.cache.getContext('2d');
    ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, w, h);
    const halo = ctx.createRadialGradient(w * 0.72, h * 0.5, 0, w * 0.6, h * 0.5, Math.max(w, h) * 0.7);
    halo.addColorStop(0, '#0E2427'); halo.addColorStop(0.45, '#0A1420'); halo.addColorStop(1, '#050810');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#203347'; ctx.globalAlpha = 0.32; ctx.lineWidth = 0.5;
    const spacing = 48;
    ctx.beginPath();
    for (let x = 0; x < w; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#8492AB';
    for (let x = 0; x < w; x += spacing) for (let y = 0; y < h; y += spacing) ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.globalAlpha = 1; ctx.strokeStyle = '#1C3541'; ctx.lineWidth = 1;
    const inset = Math.min(6, w / 4, h / 4);
    const frame = { x: inset, y: inset, w: w - inset * 2, h: h - inset * 2 };
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
    ctx.strokeStyle = '#39FF88'; ctx.globalAlpha = 0.5;
    const { x, y, w: bw, h: bh } = frame;
    for (const [cx, cy, sx, sy] of [[x,y,1,1],[x+bw,y,-1,1],[x,y+bh,1,-1],[x+bw,y+bh,-1,-1]]) {
      ctx.beginPath(); ctx.moveTo(cx,cy+sy*18); ctx.lineTo(cx,cy); ctx.lineTo(cx+sx*18,cy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  show(overdrive = 0, flash = 0) {
    const ctx = drawingContext;
    ctx.drawImage(this.cache, 0, 0);
    if (overdrive > 0 || flash > 0) {
      ctx.save(); ctx.globalAlpha = overdrive * 0.045 + flash * 0.04;
      ctx.fillStyle = '#39FF88'; ctx.fillRect(0, 0, width, height); ctx.restore();
    }
  }

  cursor(target, clock, reduced) {
    const ctx = drawingContext;
    ctx.save(); ctx.translate(target.x, target.y);
    ctx.strokeStyle = '#39FF88'; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    const r = 11 + (reduced ? 0 : Math.sin(clock * 3) * 1.5);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-13, 0); ctx.moveTo(13, 0); ctx.lineTo(17, 0); ctx.moveTo(0,-17); ctx.lineTo(0,-13); ctx.moveTo(0,13); ctx.lineTo(0,17); ctx.stroke();
    ctx.fillStyle = '#DFFFEB'; ctx.fillRect(-1,-1,2,2); ctx.restore();
  }
}
