// Un leurre est une cible passive : il attire éventuellement un poursuiveur,
// mais n'utilise jamais evade(). Il disparaît après sa durée de vie.
class Leurres extends Target {
  constructor(x, y, lifetimeSeconds = 1, velocity = null) {
    super(x, y);
    this.r = 2.5;
    this.maxSpeed = 0.5;
    this.maxForce = 0;
    this.vel = velocity ? velocity.copy() : p5.Vector.random2D().mult(random(0.05, 0.35));
    this.lifetimeMs = Math.max(0, Number(lifetimeSeconds) * 1000);
    this.ageMs = 0;
    this.rayonDetection = 0;
  }

  update() {
    super.update();
    this.edges();
    this.ageMs += deltaTime;
  }

  isExpired() {
    return this.ageMs >= this.lifetimeMs;
  }

  show() {
    push();
    stroke("#ffd166");
    strokeWeight(1);
    fill("#ffd166");
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}
