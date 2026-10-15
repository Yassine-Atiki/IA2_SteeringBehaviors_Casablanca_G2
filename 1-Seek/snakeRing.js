class SnakeRing extends Vehicle {
  constructor(x, y, predecessor, couleur, r = 12) {
    super(x, y);
    this.predecessor = predecessor;
    this.couleur = couleur;
    this.r = r;
    this.gap = 8;
    this.direction = createVector(1, 0);
    this.followPoint = this.pos.copy();
    this.resting = false;
  }

  follow(predecessor = this.predecessor) {
    this.followPoint = predecessor.pos.copy();
    this.desiredSpacing = this.r + predecessor.r + this.gap;
    return this.arrive(this.followPoint, this.desiredSpacing);
  }

  arrive(position, distanceArret = 0) {
    const error = Math.abs(p5.Vector.dist(this.pos, position) - distanceArret);
    this.resting = error <= (this.resting ? 1.2 : 0.6);
    if (this.resting) return this.vel.copy().mult(-1).limit(this.maxForce);
    return super.arrive(position, distanceArret);
  }

  update() {
    rememberSnakeDirection(this);
    super.update();
    rememberSnakeDirection(this);
  }

  show() {
    drawSnakePart(this, false);
  }
}

function rememberSnakeDirection(part) {
  if (part.vel.mag() > 0.000001) part.direction = part.vel.copy().normalize();
}

function snakeShouldRest(part, position) {
  return p5.Vector.dist(part.pos, position) <= (part.resting ? 1.2 : 0.6);
}

function drawSnakePart(part, isHead) {
  push();
  fill(part.couleur);
  stroke(isHead ? '#ffffff' : '#182536');
  strokeWeight(isHead ? 2 : 1);
  circle(part.pos.x, part.pos.y, part.r * 2);
  if (isHead) {
    const forward = part.direction.copy().mult(part.r * 0.45);
    const side = createVector(-part.direction.y, part.direction.x).mult(part.r * 0.35);
    noStroke();
    fill('#10202e');
    for (const sign of [-1, 1]) {
      circle(part.pos.x + forward.x + side.x * sign,
        part.pos.y + forward.y + side.y * sign, Math.max(2, part.r * 0.22));
    }
  }
  if (Vehicle.debug) {
    noFill();
    stroke('#ffffff44');
    circle(part.followPoint.x, part.followPoint.y, part.rayonZoneDeFreinage * 2);
    stroke('#ffcb6b');
    line(part.pos.x, part.pos.y, part.followPoint.x, part.followPoint.y);
    if (part.desiredSpacing !== undefined) {
      circle(part.followPoint.x, part.followPoint.y, part.desiredSpacing * 2);
    }
    fill('#ffcb6b');
    circle(part.followPoint.x, part.followPoint.y, 5);
    stroke('#ff6363');
    line(part.pos.x, part.pos.y, part.pos.x + part.vel.x * 10, part.pos.y + part.vel.y * 10);
  }
  pop();
}
