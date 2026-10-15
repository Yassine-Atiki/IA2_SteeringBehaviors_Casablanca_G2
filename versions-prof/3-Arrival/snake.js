class Snake extends Vehicle {
  constructor(x, y, options = {}) {
    super(x, y);
    this.head = this;
    this.rings = [];
    this.couleur = options.couleur || '#5ee0af';
    this.r = 12;
    this.direction = createVector(1, 0);
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
    const desired = Math.round(snakeParameter(count, this.rings.length || 12, 1, Math.max(100, this.rings.length + 1)));
    while (this.rings.length < desired) {
      const predecessor = this.rings.at(-1) || this;
      const position = predecessor.pos.copy().sub(predecessor.direction.copy().mult(this.r * 2 + this.gap));
      const ring = new SnakeRing(position.x, position.y, predecessor, this.couleur, this.r);
      ring.direction = predecessor.direction.copy();
      this.configureRing(ring);
      this.rings.push(ring);
    }
    this.rings.length = desired;
  }

  grow() { this.setRingCount(this.rings.length + 1); }

  arrive(position, d = 0) {
    this.resting = snakeShouldRest(this, position);
    if (this.resting) return this.vel.copy().mult(-1).limit(this.maxForce);
    return super.arrive(position, d);
  }

  updateSnake(targetPosition) {
    // Même animation que dans la correction : la tête avance, puis chaque
    // anneau arrive vers la nouvelle position du précédent et avance une fois.
    this.followPoint = targetPosition.copy();
    const headForce = this.arrive(this.followPoint, 0);
    this.applyForce(headForce);
    rememberSnakeDirection(this);
    super.update();
    rememberSnakeDirection(this);
    for (const ring of this.rings) {
      ring.applyForce(ring.follow());
      ring.update();
    }
  }

  show() {
    for (let index = this.rings.length - 1; index >= 0; index--) this.rings[index].show();
    drawSnakePart(this, true);
  }
}

function snakeParameter(value, fallback, min, max) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
}
