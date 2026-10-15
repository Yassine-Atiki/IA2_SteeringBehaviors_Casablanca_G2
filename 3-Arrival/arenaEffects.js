class ArenaEffects {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.ambient = [];
    this.reduced = false;
    this.shake = false;
    this.shakeLeft = 0;
    this.flash = 0;
    this.clock = 0;
  }

  get cap() { return this.reduced || width < 600 ? 48 : 120; }

  reset() { this.particles.length = 0; this.rings.length = 0; this.flash = 0; this.shakeLeft = 0; }

  seed(bounds) {
    this.ambient = [];
    const count = this.reduced ? 8 : (width < 600 ? 14 : 28);
    for (let i = 0; i < count; i++) {
      const p = new EnergyParticle(bounds.x + random(bounds.w), bounds.y + random(bounds.h), random(TWO_PI), 0.16, 10000, '#8492AB');
      this.ambient.push(p);
    }
  }

  burst(x, y, tint = '#00E5FF', intensity = 1) {
    const count = Math.round((this.reduced ? 7 : 20) * intensity);
    for (let i = 0; i < count && this.particles.length < this.cap; i++) {
      this.particles.push(new EnergyParticle(x, y, random(TWO_PI), random(1.5, 4), random(0.35, 0.9), tint));
    }
    this.rings.push({ x, y, life: 0.6, tint });
    if (this.rings.length > 8) this.rings.shift();
    this.flash = 0.25;
    if (this.shake && !this.reduced) this.shakeLeft = 0.13;
  }

  step(dt, bounds) {
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    for (const p of this.particles) p.step(dt);
    this.particles = this.particles.filter(p => p.life > 0).slice(-this.cap);
    for (const ring of this.rings) ring.life -= dt;
    this.rings = this.rings.filter(ring => ring.life > 0);
    for (const p of this.ambient) {
      // Slowly perturbed desired direction, with a bounded inward target near edges.
      let target = null;
      if (p.pos.x < bounds.x + 15 || p.pos.x > bounds.x + bounds.w - 15 || p.pos.y < bounds.y + 15 || p.pos.y > bounds.y + bounds.h - 15) {
        target = createVector(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
      }
      p.step(dt, target);
    }
  }

  show() {
    for (const p of this.ambient) p.show();
    for (const p of this.particles) p.show();
    const ctx = drawingContext;
    ctx.save();
    for (const ring of this.rings) {
      ctx.globalAlpha = ring.life / 0.6 * 0.65;
      ctx.strokeStyle = ring.tint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 12 + (1 - ring.life / 0.6) * 65, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
