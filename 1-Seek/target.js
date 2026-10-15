// ============================================================
// Target — Portail Dimensionnel 🌀
// La cible autonome est un portail spatial avec spirales rotatives,
// anneaux et particules en orbite.
// CONTRAT DE BORDURE : Les bords de l'écran agissent comme des murs
// infranchissables. Le portail entre en collision contre les parois
// et rebondit avec étincelles cosmiques sans jamais sortir de l'écran.
// ============================================================
class Target extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r = 45;
    this.vel = p5.Vector.random2D();
    this.vel.setMag(random(2, 5));
    this.spiralArms = 5;
    this.ringCount = 4;
    this.pulsePhase = random(TWO_PI);
    this.rotSpeed = 0.025;
    this.orbitParticles = 10;
    this.wallImpactRipple = 0; // Onde de choc lors d'un rebond contre le mur

    // Changement de comportement périodique (comme le prof)
    setInterval(() => {
      let newVel = p5.Vector.random2D();
      newVel.setMag(random(2, 5.5));

      // Si le portail est proche d'un bord, s'assurer que la vitesse va vers l'intérieur
      let margin = this.r * 1.5;
      if (this.pos.x < margin && newVel.x < 0) newVel.x = Math.abs(newVel.x);
      if (this.pos.x > width - margin && newVel.x > 0) newVel.x = -Math.abs(newVel.x);
      if (this.pos.y < margin && newVel.y < 0) newVel.y = Math.abs(newVel.y);
      if (this.pos.y > height - margin && newVel.y > 0) newVel.y = -Math.abs(newVel.y);

      this.vel = newVel;
      this.r = random(32, 52);
      this.acc = p5.Vector.random2D();
      this.acc.setMag(random(0.1, 0.4));
    }, 1000);
  }

  update() {
    // Changement aléatoire de direction
    this.vel.setHeading(this.vel.heading() + random(-0.15, 0.15));
    super.update();
    this.pulsePhase += 0.035;

    // Décroissance de l'onde de choc de collision
    if (this.wallImpactRipple > 0) {
      this.wallImpactRipple -= 0.04;
    }
  }

  // ── REBOND CONTRE LES MURS DE L'ÉCRAN (PHYSIQUE DE COLLISION) ──
  edges() {
    let margin = this.r;
    let bounced = false;
    let impactX = this.pos.x;
    let impactY = this.pos.y;

    // Mur gauche
    if (this.pos.x - margin < 0) {
      this.pos.x = margin;
      this.vel.x = Math.abs(this.vel.x); // Rebondit vers la droite
      impactX = 0;
      bounced = true;
    }
    // Mur droit
    else if (this.pos.x + margin > width) {
      this.pos.x = width - margin;
      this.vel.x = -Math.abs(this.vel.x); // Rebondit vers la gauche
      impactX = width;
      bounced = true;
    }

    // Mur supérieur
    if (this.pos.y - margin < 0) {
      this.pos.y = margin;
      this.vel.y = Math.abs(this.vel.y); // Rebondit vers le bas
      impactY = 0;
      bounced = true;
    }
    // Mur inférieur
    else if (this.pos.y + margin > height) {
      this.pos.y = height - margin;
      this.vel.y = -Math.abs(this.vel.y); // Rebondit vers le haut
      impactY = height;
      bounced = true;
    }

    // Déclencher l'effet de collision avec le mur
    if (bounced) {
      this.wallImpactRipple = 1.0;
      if (typeof ParticleSystem !== 'undefined') {
        let baseHue = (frameCount * 0.6) % 360;
        ParticleSystem.emitSparks(impactX, impactY, 16, (baseHue + 40) % 360);
      }
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);

    let pulse = sin(this.pulsePhase);
    let baseHue = (frameCount * 0.6) % 360;

    // ── 0) Onde de choc de rebond sur le mur ──
    if (this.wallImpactRipple > 0) {
      noFill();
      stroke(baseHue, 90, 100, this.wallImpactRipple * 85);
      strokeWeight(2.5 * this.wallImpactRipple);
      circle(0, 0, this.r * (2 + (1 - this.wallImpactRipple) * 2.2));
    }

    // ── 1) Lueur extérieure ──
    noStroke();
    for (let i = 6; i > 0; i--) {
      let a = 4.5 / i;
      let h = (baseHue + 20) % 360;
      fill(h, 55, 100, a);
      let sz = this.r * 3.5 * i * 0.35 + pulse * 12;
      circle(0, 0, sz);
    }

    // ── 2) Bras spiraux ──
    for (let arm = 0; arm < this.spiralArms; arm++) {
      let armAngle = (TWO_PI / this.spiralArms) * arm + frameCount * this.rotSpeed;
      stroke((baseHue + arm * 25) % 360, 75, 100, 28);
      strokeWeight(2);
      noFill();
      beginShape();
      for (let t = 0; t <= 1; t += 0.04) {
        let r = this.r * t * (1 + pulse * 0.12);
        let a = armAngle + t * PI * 1.8;
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape();
    }

    // ── 3) Anneaux concentriques rotatifs ──
    noFill();
    for (let i = 0; i < this.ringCount; i++) {
      let ringR = this.r * (0.25 + i * 0.22) + pulse * 4;
      let ringHue = (baseHue + i * 45) % 360;
      stroke(ringHue, 65, 100, 35 - i * 7);
      strokeWeight(1.8 - i * 0.3);

      push();
      rotate(frameCount * this.rotSpeed * 1.2 * (i % 2 === 0 ? 1 : -1));
      ellipse(0, 0, ringR * 2, ringR * 2);
      pop();
    }

    // ── 4) Noyau ──
    noStroke();
    fill(baseHue, 85, 100, 55 + pulse * 20);
    circle(0, 0, this.r * 0.45);
    // centre blanc éblouissant
    fill(0, 0, 100, 45 + pulse * 35);
    circle(0, 0, this.r * 0.18);

    // ── 5) Particules en orbite ──
    for (let i = 0; i < this.orbitParticles; i++) {
      let angle = frameCount * 0.04 + (TWO_PI / this.orbitParticles) * i;
      let orbitR = this.r * 0.75 + sin(frameCount * 0.025 + i * 1.3) * 12;
      let px = cos(angle) * orbitR;
      let py = sin(angle) * orbitR;
      let pHue = (baseHue + i * 30) % 360;
      fill(pHue, 75, 100, 55);
      noStroke();
      circle(px, py, 3.5 + pulse * 1.5);
      // micro-glow
      fill(pHue, 50, 100, 15);
      circle(px, py, 9 + pulse * 3);
    }

    pop();
  }
}