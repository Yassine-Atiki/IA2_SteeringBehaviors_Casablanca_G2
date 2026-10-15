class Snake extends Vehicle {
  constructor(x, y, options = {}) {
    super(x, y);
    this.head = this;
    this.rings = [];
    this.couleur = options.couleur || '#5ee0af';
    this.r = 12;
    this.direction = options.direction?.copy() || createVector(1, 0);
    this.followPoint = this.pos.copy();
    this.resting = false;
    this.configure(options);
    this.setRingCount(options.ringCount ?? 12);
  }

  configure(options = {}) {
    this.r = snakeParameter(options.r, this.r ?? 12, 4, 30);
    this.maxSpeed = snakeParameter(options.headSpeed, this.maxSpeed, 0, 40);
    this.maxForce = snakeParameter(options.headForce, this.maxForce, 0, 10);
    this.rayonZoneDeFreinage = snakeParameter(options.headBraking, this.rayonZoneDeFreinage, 20, 300);
    this.gap = snakeParameter(options.gap, this.gap ?? 8, 0, 80);
    this.ringSpeed = snakeParameter(options.ringSpeed, this.ringSpeed ?? 5, 0, 40);
    this.ringForce = snakeParameter(options.ringForce, this.ringForce ?? 0.3, 0, 10);
    this.ringBraking = snakeParameter(options.ringBraking, this.ringBraking ?? 50, 20, 300);
    if (options.couleur) this.couleur = options.couleur;
    for (const ring of this.rings) this.configureRing(ring);
  }

  configureRing(ring) {
    ring.r = this.r;
    ring.gap = this.gap;
    ring.couleur = this.couleur;
    ring.maxSpeed = this.ringSpeed;
    ring.maxForce = this.ringForce;
    ring.rayonZoneDeFreinage = this.ringBraking;
  }

  setRingCount(count) {
    const desired = Math.round(snakeParameter(
      count,
      this.rings.length || 12,
      1,
      Math.max(100, this.rings.length + 1)
    ));
    while (this.rings.length < desired) {
      const predecessor = this.rings.at(-1) || this;
      const spacing = this.r * 2 + this.gap;
      const position = predecessor.pos.copy().sub(predecessor.direction.copy().mult(spacing));
      const ring = new SnakeRing(position.x, position.y, predecessor, this.couleur, this.r);
      ring.direction = predecessor.direction.copy();
      this.configureRing(ring);
      this.rings.push(ring);
    }
    this.rings.length = desired;
  }

  arrive(position, distanceArret = 0) {
    this.resting = snakeShouldRest(this, position);
    if (this.resting) return this.vel.copy().mult(-1).limit(this.maxForce);
    return super.arrive(position, distanceArret);
  }

  updateSnake(targetPosition) {
    this.followPoint = targetPosition.copy();
    this.advanceSnake(this.arrive(this.followPoint));
  }

  advanceSnake(headForce) {
    this.applyForce(headForce);
    rememberSnakeDirection(this);
    super.update();
    rememberSnakeDirection(this);
    for (const ring of this.rings) {
      ring.applyForce(ring.follow());
      ring.update();
    }
  }

  edges() {
    super.edges();
    for (const ring of this.rings) ring.edges();
  }

  show() {
    for (let index = this.rings.length - 1; index >= 0; index--) {
      this.rings[index].show();
    }
    drawSnakePart(this, true);
  }
}

function snakeParameter(value, fallback, min, max) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
}
