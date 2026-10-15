// The original Snake remains responsible for every authoritative movement update.
class NeonSnake extends Snake {
  constructor(...args) {
    super(...args);
    this.trail = [];
    this.flare = 0;
    this.angle = 0;
    this.segmentSprite = null;
  }

  update(target) { super.update(target); }

  recordTrail(dt, reduced) {
    this.flare = Math.max(0, this.flare - dt * 2);
    for (const point of this.trail) point.life -= dt;
    this.trail = this.trail.filter(point => point.life > 0);
    if (!reduced && this.head.vel.magSq() > 0.3) {
      this.trail.push({ x: this.head.pos.x, y: this.head.pos.y, life: 0.55 });
      if (this.trail.length > 40) this.trail.shift();
    }
  }

  createSegmentSprite() {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 96;
    const context = sprite.getContext('2d');
    const shade = context.createRadialGradient(38, 33, 2, 50, 52, 32);
    shade.addColorStop(0, this.couleur);
    shade.addColorStop(0.35, '#123C32');
    shade.addColorStop(1, '#071C1C');
    context.fillStyle = shade;
    context.shadowColor = this.couleur;
    context.shadowBlur = 8;
    context.strokeStyle = this.couleur;
    context.lineWidth = 2.5;
    context.beginPath(); context.arc(48, 48, 32, 0, Math.PI * 2); context.fill(); context.stroke();
    this.segmentSprite = sprite;
  }

  show(clock = 0, overdrive = 0, reduced = false) {
    const ctx = drawingContext;
    const speed = this.head.vel.mag() / Math.max(0.1, this.head.maxSpeed);
    const glow = reduced ? 0 : 8 + speed * 5 + overdrive * 9 + this.flare * 10;
    if (!this.segmentSprite) this.createSegmentSprite();
    ctx.save();
    ctx.strokeStyle = this.couleur;
    ctx.lineWidth = this.taille * (overdrive > 0 ? 0.9 : 0.5);
    ctx.lineCap = 'round';
    // Historical snapshots fade in place; they never affect collision or physics.
    for (let i = 1; i < this.trail.length; i++) {
      ctx.globalAlpha = this.trail[i].life / 0.55 * 0.16;
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // A narrow membrane joins independent rings without changing their positions.
    // The fine dashed line provides energy flow along the existing body path.
    if (this.anneaux.length) {
      ctx.beginPath();
      ctx.moveTo(this.head.pos.x, this.head.pos.y);
      for (const part of this.anneaux) ctx.lineTo(part.pos.x, part.pos.y);
      ctx.strokeStyle = '#0D3028'; ctx.lineWidth = this.taille * 1.35; ctx.globalAlpha = 0.8; ctx.stroke();
      ctx.strokeStyle = this.couleur; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 14]); ctx.lineDashOffset = reduced ? 0 : -clock * (12 + speed * 15); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // Two layered passes per ring, with one restrained glow pass.
    for (let i = this.anneaux.length - 1; i >= 0; i--) {
      const part = this.anneaux[i];
      const r = this.taille * (1 - i / Math.max(1, this.anneaux.length) * 0.35);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.segmentSprite, part.pos.x - r * 1.5, part.pos.y - r * 1.5, r * 3, r * 3);
      ctx.globalAlpha = 0.25 + (Math.sin(clock * 3 - i * 0.45) + 1) * 0.16;
      ctx.fillStyle = this.couleur;
      ctx.beginPath(); ctx.arc(part.pos.x - r * 0.2, part.pos.y - r * 0.25, r * 0.63, 0, TWO_PI); ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#DBFFED';
      ctx.beginPath(); ctx.arc(part.pos.x - r * 0.34, part.pos.y - r * 0.42, r * 0.18, 0, TWO_PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.translate(this.head.pos.x, this.head.pos.y);
    if (this.head.vel.magSq() > 0.01) this.angle = this.head.vel.heading();
    ctx.rotate(this.angle);
    ctx.shadowColor = this.couleur;
    ctx.shadowBlur = glow;
    ctx.fillStyle = this.couleur;
    ctx.beginPath(); ctx.arc(0, 0, this.taille * 1.18, 0, TWO_PI); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#C6FFDF';
    ctx.beginPath(); ctx.arc(-3, -5, this.taille * 0.42, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#050810';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(this.taille * 0.43, side * this.taille * 0.5, 3, 2.4, 0, 0, TWO_PI); ctx.fill();
    }
    ctx.fillStyle = '#F3F7FF';
    ctx.fillRect(this.taille * 0.5, -this.taille * 0.56, 1.5, 1.5);
    ctx.fillRect(this.taille * 0.5, this.taille * 0.43, 1.5, 1.5);
    ctx.restore();
  }
}
