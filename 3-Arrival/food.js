class Food extends Vehicle {
  constructor(x, y, taille = 11) {
    super(x, y);
    this.r = taille;
    this.valeur = 1;
  }

  repositionner(x, y) {
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.acc.set(0, 0);
  }

  show() {
    const pulsation = sin(frameCount * 0.12) * 1.6;
    push();
    noStroke();
    fill(255, 85, 140, 30);
    circle(this.pos.x, this.pos.y, (this.r + 11 + pulsation) * 2);
    fill(0, 0, 0, 55);
    circle(this.pos.x + 3, this.pos.y + 5, this.r * 2);
    fill(255, 89, 137);
    circle(this.pos.x, this.pos.y, this.r * 2);
    fill(255, 198, 216, 165);
    circle(this.pos.x - this.r * 0.28, this.pos.y - this.r * 0.31, this.r * 0.75);
    stroke(120, 231, 174);
    strokeWeight(2);
    line(this.pos.x, this.pos.y - this.r * 0.62, this.pos.x + this.r * 0.35, this.pos.y - this.r * 1.25);
    pop();
  }
}
