class Target extends Vehicle {
  static MAX_DECOYS = 100;

  constructor(x, y) {
    super(x, y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(6);

    // propriété de la target
    this.rayonDetection = 100;
    this.fleeTimeRemaining = 0;
    this.wasDetected = false;
    this.evadeThreat = null;
    this.decoysRemaining = Target.MAX_DECOYS;
    this.decoyCooldownRemaining = 0;
  }

  show(showDebug = Vehicle.debug) {

    push();

    // On dessine un cercle de detection
    if (showDebug) {
      push();
      noFill();
      stroke("white");
      circle(this.pos.x, this.pos.y, this.rayonDetection * 2);
      pop();
    }

    // on dessine la target
    stroke("white");
    strokeWeight(2);
    fill("pink");
    translate(this.pos.x, this.pos.y);
    circle(0, 0, this.r * 2);

    fill("white");
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text(String(this.decoysRemaining), 0, -this.r - 8);

    pop();
  }
}
