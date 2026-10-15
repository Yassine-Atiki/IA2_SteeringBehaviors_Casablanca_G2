// Even decorative moving entities use Vehicle steering and inherited locomotion.
class EnergyParticle extends Vehicle {
  constructor(x, y, angle, speed = 2, life = 0.8, tint = '#00E5FF') {
    super(x, y);
    this.direction = createVector(Math.cos(angle), Math.sin(angle));
    this.maxSpeed = speed;
    this.maxForce = Math.max(0.015, speed * 0.3);
    this.life = life;
    this.duration = life;
    this.tint = tint;
    this.size = 1.5 + speed * 0.35;
  }

  step(dt, target = null) {
    this.life = Math.max(0, this.life - dt);
    const desired = target ? p5.Vector.sub(target, this.pos).limit(this.maxSpeed) :
      this.direction.copy().mult(this.maxSpeed * this.life / this.duration);
    const steering = p5.Vector.sub(desired, this.vel).limit(this.maxForce);
    this.applyForce(steering);
    super.update();
  }

  show() {
    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.duration) * 0.8;
    ctx.fillStyle = this.tint;
    ctx.fillRect(this.pos.x - this.size / 2, this.pos.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}
