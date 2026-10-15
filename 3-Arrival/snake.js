class Snake extends Vehicle {
  constructor(x, y, nombreAnneaux = 12, taille = 12, couleur = "#55d98a", configuration = {}) {
    super(x, y);

    this.taille = Math.max(1, Number(taille) || 1);
    this.couleur = couleur;
    this.distanceDeSuivi = this.taille * 2;
    this.maxSpeedTete = configuration.maxSpeedTete ?? 4;
    this.maxForceTete = configuration.maxForceTete ?? 0.2;
    this.maxSpeedAnneaux = configuration.maxSpeedAnneaux ?? 4;
    this.maxForceAnneaux = configuration.maxForceAnneaux ?? 0.2;

    this.head = this.creerPartie(x, y, this.maxSpeedTete, this.maxForceTete);
    this.anneaux = [];

    const nombre = Math.max(0, Math.floor(Number(nombreAnneaux) || 0));
    for (let index = 0; index < nombre; index++) {
      const anneau = this.creerPartie(
        x - (index + 1) * this.distanceDeSuivi,
        y,
        this.maxSpeedAnneaux,
        this.maxForceAnneaux
      );
      this.anneaux.push(anneau);
    }
  }

  creerPartie(x, y, maxSpeed, maxForce) {
    const partie = new Vehicle(x, y);
    partie.r = this.taille;
    partie.maxSpeed = maxSpeed;
    partie.maxForce = maxForce;
    return partie;
  }

  appliquerParametres({ maxSpeedTete, maxForceTete, maxSpeedAnneaux, maxForceAnneaux }) {
    if (Number.isFinite(maxSpeedTete)) {
      this.maxSpeedTete = maxSpeedTete;
      this.head.maxSpeed = maxSpeedTete;
    }
    if (Number.isFinite(maxForceTete)) {
      this.maxForceTete = maxForceTete;
      this.head.maxForce = maxForceTete;
    }

    if (Number.isFinite(maxSpeedAnneaux)) this.maxSpeedAnneaux = maxSpeedAnneaux;
    if (Number.isFinite(maxForceAnneaux)) this.maxForceAnneaux = maxForceAnneaux;
    this.anneaux.forEach((anneau) => {
      anneau.maxSpeed = this.maxSpeedAnneaux;
      anneau.maxForce = this.maxForceAnneaux;
    });
  }

  ajouterAnneau() {
    const dernier = this.anneaux[this.anneaux.length - 1] || this.head;
    const direction = dernier.vel.copy();
    if (direction.magSq() < 0.0001) direction.set(-1, 0);
    else direction.normalize().mult(-1);

    const anneau = this.creerPartie(
      dernier.pos.x + direction.x * this.distanceDeSuivi,
      dernier.pos.y + direction.y * this.distanceDeSuivi,
      this.maxSpeedAnneaux,
      this.maxForceAnneaux
    );
    this.anneaux.push(anneau);
  }

  update(cible) {
    const forceTete = this.head.arrive(cible);
    this.head.applyForce(forceTete);
    this.head.update();

    let precedent = this.head;
    for (const anneau of this.anneaux) {
      // Même règle que la correction : l'anneau vise le centre de la partie
      // précédente et arrive à distanceDeSuivi, sans cible angulaire mobile.
      const forceAnneau = anneau.arrive(precedent.pos, this.distanceDeSuivi);
      anneau.applyForce(forceAnneau);
      anneau.update();
      precedent = anneau;
    }
  }

  show() {
    this.dessinerOmbre();
    this.anneaux.forEach((anneau, index) => this.dessinerAnneau(anneau, index));
    this.dessinerTete();
  }

  dessinerOmbre() {
    push();
    noStroke();
    fill(0, 0, 0, 55);
    for (const anneau of this.anneaux) {
      circle(anneau.pos.x + 5, anneau.pos.y + 7, this.taille * 2.05);
    }
    circle(this.head.pos.x + 5, this.head.pos.y + 7, this.taille * 2.18);
    pop();
  }

  dessinerAnneau(anneau, index) {
    const progression = this.anneaux.length > 1 ? index / (this.anneaux.length - 1) : 0;
    const rayon = this.taille * (1 - progression * 0.22);
    push();
    stroke(255, 255, 255, 32);
    strokeWeight(1.2);
    fill(this.couleur);
    circle(anneau.pos.x, anneau.pos.y, rayon * 2);
    noStroke();
    fill(255, 255, 255, 45);
    circle(anneau.pos.x - rayon * 0.28, anneau.pos.y - rayon * 0.3, rayon * 0.7);
    fill(0, 0, 0, 35);
    circle(anneau.pos.x + rayon * 0.28, anneau.pos.y + rayon * 0.34, rayon * 0.5);
    pop();
  }

  dessinerTete() {
    const direction = this.head.vel.copy();
    if (direction.magSq() < 0.0001) direction.set(1, 0);

    push();
    translate(this.head.pos.x, this.head.pos.y);
    rotate(direction.heading());
    stroke(255, 255, 255, 50);
    strokeWeight(1.5);
    fill(this.couleur);
    circle(0, 0, this.taille * 2.35);
    noStroke();
    fill(255, 255, 255, 52);
    circle(-this.taille * 0.3, -this.taille * 0.38, this.taille * 0.9);
    fill(246, 250, 255);
    circle(this.taille * 0.42, -this.taille * 0.47, this.taille * 0.52);
    circle(this.taille * 0.42, this.taille * 0.47, this.taille * 0.52);
    fill(22, 28, 41);
    circle(this.taille * 0.56, -this.taille * 0.47, this.taille * 0.22);
    circle(this.taille * 0.56, this.taille * 0.47, this.taille * 0.22);
    stroke(255, 116, 155);
    strokeWeight(1.8);
    line(this.taille * 1.03, 0, this.taille * 1.56, 0);
    line(this.taille * 1.56, 0, this.taille * 1.75, -this.taille * 0.18);
    line(this.taille * 1.56, 0, this.taille * 1.75, this.taille * 0.18);
    pop();
  }
}
