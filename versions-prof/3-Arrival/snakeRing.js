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
    // Comme dans 3-Arrival_correction/snake.js : viser le centre du
    // précédent avec une distance d'arrêt, sans point orienté artificiel.
    this.followPoint = predecessor.pos.copy();
    this.desiredSpacing = this.r + predecessor.r + this.gap;
    return this.arrive(this.followPoint, this.desiredSpacing);
  }

  arrive(position, d = 0) {
    // Hystérésis : freiner dans une petite zone, ne repartir qu'après une
    // vraie variation de la cible. Aucune position n'est corrigée de force.
    const error = Math.abs(p5.Vector.dist(this.pos, position) - d);
    this.resting = error <= (this.resting ? 1.2 : 0.6);
    if (this.resting) return this.vel.copy().mult(-1).limit(this.maxForce);
    return super.arrive(position, d);
  }

  seek(position, arrival = false, d = 0) {
    if (!arrival || d < this.rayonZoneDeFreinage) return super.seek(position, arrival, d);
    // Cas du curseur d'espacement supérieur à la zone de freinage :
    // préserver une pente positive et éviter le dénominateur nul de la base.
    const desired = p5.Vector.sub(position, this.pos);
    const speed = this.maxSpeed * Math.max(-1, Math.min(1,
      (desired.mag() - d) / this.rayonZoneDeFreinage));
    return desired.setMag(speed).sub(this.vel).limit(this.maxForce);
  }

  update() {
    rememberSnakeDirection(this);
    super.update();
    rememberSnakeDirection(this);
  }

  show() { drawSnakePart(this, false); }
}

function rememberSnakeDirection(part) {
  // Ne jamais calculer un angle depuis (0, 0). Mémoriser aussi AVANT
  // le freinage : update() peut annuler la vitesse en une seule image.
  if (part.vel.mag() > 0.000001) part.direction = part.vel.copy().normalize();
}

function snakeShouldRest(part, position) {
  const distance = p5.Vector.dist(part.pos, position);
  return distance <= (part.resting ? 1.2 : 0.6);
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
