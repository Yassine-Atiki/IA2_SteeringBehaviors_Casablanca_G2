// Passive à l'apparition, puis attirée par la première tête à portée.
class Nourriture extends Vehicle {
  constructor(x, y, sprite = null) {
    super(x, y);
    this.r = 12;
    this.maxSpeed = 6;
    this.maxForce = 0.4;
    this.rayonZoneDeFreinage = 35;
    this.detectionRadius = 100;
    this.sprite = sprite;
    this.target = null;
    this.consumed = false;
  }

  advance(snakes) {
    if (this.consumed) return;
    if (this.target && !snakes.includes(this.target)) this.target = null;
    if (!this.target) {
      let nearestDistance = this.detectionRadius;
      for (const snake of snakes) {
        const distance = p5.Vector.dist(this.pos, snake.pos);
        if (distance <= nearestDistance) {
          this.target = snake;
          nearestDistance = distance;
        }
      }
    }
    if (this.target) this.applyForce(super.arrive(this.target.pos, 0));
    else this.applyForce(this.vel.copy().mult(-1).limit(this.maxForce));
    super.update();
  }

  tryConsume(snakes) {
    if (this.consumed) return false;
    for (const snake of snakes) {
      if (p5.Vector.dist(this.pos, snake.pos) <= this.r + snake.r) {
        this.consumed = true;
        snake.grow();
        return true;
      }
    }
    return false;
  }

  show() {
    if (this.consumed) return;
    push();
    if (Vehicle.debug) {
      noFill();
      stroke('#ffd16666');
      circle(this.pos.x, this.pos.y, this.detectionRadius * 2);
    }
    if (this.sprite) image(this.sprite, this.pos.x - this.r, this.pos.y - this.r, this.r * 2, this.r * 2);
    else {
      noStroke(); fill('#ffce66'); circle(this.pos.x, this.pos.y, this.r * 2);
    }
    pop();
  }
}

// Horloge de simulation injectable : ne pas créer de setInterval dans draw.
class FoodSpawner {
  constructor(intervalSeconds = 5) {
    this.intervalMs = intervalSeconds * 1000;
    this.elapsedMs = 0;
  }

  setInterval(seconds) {
    this.intervalMs = snakeParameter(seconds, 5, 0.5, 20) * 1000;
    this.elapsedMs = 0;
  }

  advance(deltaMs, spawn) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    // Les longues pauses d'onglet ne provoquent pas une rafale d'apparitions.
    this.elapsedMs += Math.min(deltaMs, this.intervalMs);
    if (this.elapsedMs >= this.intervalMs) {
      this.elapsedMs -= this.intervalMs;
      spawn();
    }
  }
}
