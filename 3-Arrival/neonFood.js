class NeonFood extends Food {
  constructor(x, y, radius = 11) {
    super(x, y, radius);
    this.sparks = [0, 1, 2].map(i => new EnergyParticle(x + 27 * Math.cos(i * TWO_PI / 3), y + 27 * Math.sin(i * TWO_PI / 3), 0, 3, 10000));
    this.target = createVector(x, y);
  }

  repositionner(x, y) {
    super.repositionner(x, y);
    // Respawn is an explicit scene event, not continuous movement.
    this.sparks.forEach((p, i) => {
      p.pos.set(x + 27 * Math.cos(i * TWO_PI / 3), y + 27 * Math.sin(i * TWO_PI / 3));
      p.vel.set(0, 0);
      p.acc.set(0, 0);
    });
  }

  step(dt, clock) {
    this.sparks.forEach((p, i) => {
      const angle = clock * 1.4 + i * TWO_PI / 3;
      this.target.set(this.pos.x + 27 * Math.cos(angle), this.pos.y + 27 * Math.sin(angle));
      p.step(dt, this.target);
    });
  }

  show(clock = 0, reduced = false) {
    const ctx = drawingContext;
    const pulse = reduced ? 0 : Math.sin(clock * 3) * 2;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.fillStyle = '#00E5FF';
    ctx.globalAlpha = 0.06;
    ctx.beginPath(); ctx.arc(0, 0, 35 + pulse, 0, TWO_PI); ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(0, 0, 22 + pulse, 0, TWO_PI); ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.rotate(reduced ? 0 : clock * 0.5);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, 21, i * TWO_PI / 3, i * TWO_PI / 3 + 1.3); ctx.stroke();
    }
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = reduced ? 0 : 18;
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#D5FCFF';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    if (!reduced) this.sparks.forEach(p => p.show());
  }
}
