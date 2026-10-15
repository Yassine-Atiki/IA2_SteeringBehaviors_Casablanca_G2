// ============================================================
// vehicle.js — Chasseurs Spatiaux & Intercepteurs Cosmiques 🚀✨
// Le principe IA est IDENTIQUE au code de Craig Reynolds :
//   force = vitesseDésirée - vitesseActuelle
// Rendu : Véhicules spatiaux haute définition avec cockpit lumineux,
// ailes delta aérodynamiques, réacteurs jumeaux à flammes plasma
// orientés vers la cible, et sillage ionique.
// ============================================================
class Vehicle {
  constructor(x, y) {
    // ── Propriétés physiques (identiques au code du prof) ──
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.maxForce = 0.1;
    this.r = 18; // Rayon de collision bien proportionné

    // ── Propriétés visuelles — Vaisseau ──
    this.trail = [];
    this.trailMax = 24;
    this.isPredator = false;
    this.bodyHueOffset = random(-12, 12);
    this.enginePhase = random(TWO_PI);
    this.beaconPhase = random(TWO_PI);

    // Vecteurs pour affichage debug
    this.debugDesired = null;
    this.debugSteer = null;
  }

  // ── Comportement Seek — FORMULE MAGIQUE DU PROF ──
  // force = desiredSpeed - currentSpeed
  applyBehaviors(target) {
    let force = this.seek(target);
    this.applyForce(force);
  }

  seek(target) {
    // ETAPE 1 : vitesse désirée → direction vers la cible
    let desiredSpeed = p5.Vector.sub(target, this.pos);

    // ETAPE 2 : pilotage — on normalise à maxSpeed
    desiredSpeed.setMag(this.maxSpeed);

    // FORMULE MAGIQUE : force = desiredSpeed - currentSpeed
    let force = p5.Vector.sub(desiredSpeed, this.vel);

    // on limite la force
    force.limit(this.maxForce);

    // Sauvegarde des vecteurs pour visualisation debug
    this.debugDesired = desiredSpeed.copy();
    this.debugSteer = force.copy();

    return force;
  }

  // Comportement de fuite — inverse de seek
  flee(target) {
    return this.seek(target).mult(-1);
  }

  // ── Méthodes de physique (identiques) ──
  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    // accélération → vitesse → position
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // Enregistrement de la traînée ionique
    if (frameCount % 2 === 0) {
      this.trail.push({ x: this.pos.x, y: this.pos.y });
      if (this.trail.length > this.trailMax) this.trail.shift();
    }
  }

  // ── Rendu visuel haute fidélité ──
  show(showDebug = false) {
    let speed = this.vel.mag();
    let speedRatio = constrain(speed / max(this.maxSpeed, 0.01), 0, 1);
    let heading = this.vel.heading();

    // Palette dynamique basée sur la vitesse
    let hue;
    if (this.isPredator) {
      hue = lerp(0, 25, speedRatio); // Rouge écarlate à braise solaire
    } else {
      hue = (lerp(185, 310, speedRatio) + this.bodyHueOffset + 360) % 360; // Cyan à Violet/Rose
    }

    // 1) Sillage / Traînée ionique
    this._drawTrail(hue, speedRatio);

    // 2) Vecteurs Debug (si activés)
    if (showDebug) {
      this._drawDebugVectors();
    }

    // 3) Rendu du vaisseau orienté dans la direction du mouvement
    push();
    translate(this.pos.x, this.pos.y);
    rotate(heading);

    if (this.isPredator) {
      this._drawPredatorShip(hue, speedRatio);
    } else {
      this._drawStarfighter(hue, speedRatio);
    }

    pop();
  }

  // ── CHASSEUR STELLAIRE (Vaisseau Normal) ──
  _drawStarfighter(hue, speedRatio) {
    let bs = 1.0;

    // A) Flammes des réacteurs arrière (jaillissent vers l'arrière: -X)
    this._drawThrusterFlames(hue, speedRatio, bs);

    // B) Lueur du bouclier énergétique
    noStroke();
    let shieldAlpha = 8 + speedRatio * 8;
    fill(hue, 65, 100, shieldAlpha);
    ellipse(0, 0, 48 * bs, 34 * bs);

    // C) Coque principale aérodynamique (Delta Wing Fuselage)
    // Structure sombre métallique avec découpes high-tech
    stroke(hue, 90, 100, 95);
    strokeWeight(1.4);
    fill(225, 45, 18); // Métal spatial profond et contrasté

    beginShape();
    vertex(22 * bs, 0);          // Nez acéré orienté vers la cible
    vertex(8 * bs, 6 * bs);      // Décrochement d'entrée d'air
    vertex(-2 * bs, 17 * bs);    // Bord d'attaque de l'aile gauche
    vertex(-13 * bs, 15 * bs);   // Ailette arrière gauche
    vertex(-9 * bs, 8 * bs);     // Encastrement aile-fuselage
    vertex(-12 * bs, 6 * bs);    // Tuyère réacteur gauche
    vertex(-12 * bs, 2 * bs);    // Séparateur réacteur
    vertex(-10 * bs, 0);         // Quille centrale arrière
    vertex(-12 * bs, -2 * bs);   // Séparateur réacteur droit
    vertex(-12 * bs, -6 * bs);   // Tuyère réacteur droit
    vertex(-9 * bs, -8 * bs);    // Encastrement aile-fuselage
    vertex(-13 * bs, -15 * bs);  // Ailette arrière droite
    vertex(-2 * bs, -17 * bs);   // Bord d'attaque aile droite
    vertex(8 * bs, -6 * bs);     // Décrochement d'entrée d'air
    endShape(CLOSE);

    // D) Plaques de blindage supérieures colorées (Dorsal Plates)
    noStroke();
    fill(hue, 85, 95, 90);
    beginShape();
    vertex(16 * bs, 0);
    vertex(3 * bs, 4 * bs);
    vertex(-6 * bs, 5 * bs);
    vertex(-8 * bs, 0);
    vertex(-6 * bs, -5 * bs);
    vertex(3 * bs, -4 * bs);
    endShape(CLOSE);

    // Lignes néon de structure sur les ailes
    stroke(hue, 95, 100, 90);
    strokeWeight(1.2);
    line(4 * bs, 4 * bs, -8 * bs, 13 * bs);
    line(4 * bs, -4 * bs, -8 * bs, -13 * bs);

    // E) Cockpit Haute Visibilité (Visor Canopy)
    // Verrière futuriste brillante pointée vers l'avant
    noStroke();
    // Halo du cockpit
    fill(195, 80, 100, 40);
    ellipse(8 * bs, 0, 15 * bs, 7 * bs);

    // Vitre du cockpit (cyan électrique)
    fill(195, 95, 100, 95);
    beginShape();
    vertex(14 * bs, 0);         // Pointe avant de la verrière
    vertex(7 * bs, 3.2 * bs);
    vertex(2 * bs, 0);
    vertex(7 * bs, -3.2 * bs);
    endShape(CLOSE);

    // Reflet blanc spéculaire sur le verre
    fill(0, 0, 100, 95);
    ellipse(10 * bs, -0.8 * bs, 5 * bs, 1.8 * bs);

    // F) Balises lumineuses de navigation aux bouts des ailes
    let beaconBlink = sin(frameCount * 0.15 + this.beaconPhase) > 0 ? 100 : 30;
    fill(hue, 90, 100, beaconBlink);
    noStroke();
    circle(-3 * bs, 17 * bs, 3.2 * bs);
    circle(-3 * bs, -17 * bs, 3.2 * bs);
  }

  // ── FLAMMES DES RÉACTEURS JUMEAUX ──
  _drawThrusterFlames(hue, speedRatio, bs) {
    let flicker = sin(frameCount * 0.55 + this.enginePhase) * 3;
    let flameLen = (12 + flicker) * (0.8 + speedRatio * 1.5) * bs;
    let flameW = 3.5 * bs;

    const nozzles = [-4.2 * bs, 4.2 * bs];

    for (let ny of nozzles) {
      // Flamme externe (plasma coloré)
      noStroke();
      fill((hue + 25) % 360, 90, 100, 75);
      beginShape();
      vertex(-12 * bs, ny - flameW);
      vertex(-12 * bs - flameLen, ny);
      vertex(-12 * bs, ny + flameW);
      endShape(CLOSE);

      // Cœur de flamme incandescent (blanc-bleu très brillant)
      fill(0, 0, 100, 95);
      beginShape();
      vertex(-12 * bs, ny - flameW * 0.5);
      vertex(-12 * bs - flameLen * 0.6, ny);
      vertex(-12 * bs, ny + flameW * 0.5);
      endShape(CLOSE);
    }
  }

  // ── CHASSEUR PRÉDATEUR (Dreadnought Écarlate) ──
  _drawPredatorShip(hue, speedRatio) {
    let bs = 1.75; // Imposant et colossal

    // A) Triple réacteur flamboyant
    let flicker = sin(frameCount * 0.6 + this.enginePhase) * 5;
    let flameLen = (16 + flicker) * (0.9 + speedRatio * 1.6) * bs;
    const nozzles = [-6 * bs, 0, 6 * bs];

    for (let ny of nozzles) {
      let fW = (ny === 0 ? 4.5 : 3.2) * bs;
      let fL = (ny === 0 ? flameLen * 1.2 : flameLen);

      // Flamme rouge-orange ardente
      fill(25, 100, 100, 80);
      beginShape();
      vertex(-14 * bs, ny - fW);
      vertex(-14 * bs - fL, ny);
      vertex(-14 * bs, ny + fW);
      endShape(CLOSE);

      // Cœur blanc-jaune
      fill(50, 100, 100, 95);
      beginShape();
      vertex(-14 * bs, ny - fW * 0.4);
      vertex(-14 * bs - fL * 0.55, ny);
      vertex(-14 * bs, ny + fW * 0.4);
      endShape(CLOSE);
    }

    // B) Bouclier rouge sang
    fill(0, 100, 100, 12);
    noStroke();
    ellipse(0, 0, 60 * bs, 50 * bs);

    // C) Coque noire menaçante avec ailes inversées acérées
    stroke(0, 95, 100, 95);
    strokeWeight(1.8);
    fill(0, 25, 12); // Noir anthracite impérial

    beginShape();
    vertex(26 * bs, 0);          // Pointe avant redoutable
    vertex(12 * bs, 7 * bs);     // Canards avant
    vertex(4 * bs, 20 * bs);     // Griffes d'ailes avancées
    vertex(-8 * bs, 22 * bs);    // Pointe d'aile principale
    vertex(-14 * bs, 9 * bs);    // Flanc réacteur gauche
    vertex(-14 * bs, -9 * bs);   // Flanc réacteur droit
    vertex(-8 * bs, -22 * bs);   // Pointe d'aile principale droite
    vertex(4 * bs, -20 * bs);    // Griffes d'ailes avancées
    vertex(12 * bs, -7 * bs);    // Canards avant
    endShape(CLOSE);

    // Lignes de puissance écarlates
    stroke(0, 100, 100, 90);
    strokeWeight(1.5);
    line(10 * bs, 0, -10 * bs, 14 * bs);
    line(10 * bs, 0, -10 * bs, -14 * bs);

    // D) Oculaire prédateur (Visière rouge cyclopéenne)
    noStroke();
    fill(0, 100, 100, 100);
    beginShape();
    vertex(18 * bs, 0);
    vertex(10 * bs, 3 * bs);
    vertex(6 * bs, 0);
    vertex(10 * bs, -3 * bs);
    endShape(CLOSE);

    // Reflet blanc au centre de l'œil
    fill(0, 0, 100, 95);
    circle(14 * bs, 0, 2.5 * bs);
  }

  // ── SILLAGE IONIQUE ULTRA-FLUIDE ──
  _drawTrail(hue, speedRatio) {
    if (this.trail.length < 2) return;

    noFill();
    for (let i = 1; i < this.trail.length; i++) {
      let t = i / this.trail.length;
      let alpha = t * 45 * (0.5 + speedRatio * 0.7);
      let weight = t * (this.isPredator ? 6.0 : 3.4);

      // Ligne extérieure néon
      stroke(hue, 85, 100, alpha);
      strokeWeight(weight);
      line(
        this.trail[i - 1].x, this.trail[i - 1].y,
        this.trail[i].x, this.trail[i].y
      );

      // Cœur énergétique plus intense
      if (t > 0.35) {
        stroke(0, 0, 100, alpha * 0.7);
        strokeWeight(weight * 0.38);
        line(
          this.trail[i - 1].x, this.trail[i - 1].y,
          this.trail[i].x, this.trail[i].y
        );
      }
    }
  }

  // ── VECTEURS DEBUG DE REYNOLDS ──
  _drawDebugVectors() {
    push();
    // Repère centré sur la position réelle du véhicule (coordonnées monde)
    translate(this.pos.x, this.pos.y);

    const vScale = 10; // Échelle de visualisation des vitesses
    let vx = this.vel.x * vScale;
    let vy = this.vel.y * vScale;

    // 1) Vitesse actuelle (Bleu) — part du véhicule
    const blueColor = color(210, 95, 100, 95);
    this._drawDebugArrow(0, 0, vx, vy, blueColor, 2.2, 6);

    if (this.debugDesired) {
      let dx = this.debugDesired.x * vScale;
      let dy = this.debugDesired.y * vScale;

      // 2) Vitesse désirée vers la cible (Vert) — part du véhicule
      const greenColor = color(120, 95, 100, 95);
      this._drawDebugArrow(0, 0, dx, dy, greenColor, 2.2, 6);

      // 3) Force de braquage selon Craig Reynolds (Rouge) : Vd - Va
      // Vecteur qui relie la pointe de Va (bleu) à la pointe de Vd (vert)
      const redColor = color(0, 95, 100, 95);
      this._drawDebugArrow(vx, vy, dx, dy, redColor, 2.5, 7);

      // Indicateurs ponctuels discrets aux extrémités
      noStroke();
      fill(120, 95, 100, 90);
      circle(dx, dy, 5);
      fill(210, 95, 100, 90);
      circle(vx, vy, 4);
    } else if (this.debugSteer) {
      // Si seule la force est disponible
      let fScale = 120;
      let fx = this.debugSteer.x * fScale;
      let fy = this.debugSteer.y * fScale;
      const redColor = color(0, 95, 100, 95);
      this._drawDebugArrow(0, 0, fx, fy, redColor, 2.5, 7);
    }

    pop();
  }

  // Tracé d'une flèche vectorielle avec pointe triangulaire
  _drawDebugArrow(x1, y1, x2, y2, col, sw = 2, arrowSize = 6) {
    let d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 1.5) return;
    stroke(col);
    strokeWeight(sw);
    line(x1, y1, x2, y2);

    let angle = Math.atan2(y2 - y1, x2 - x1);
    push();
    translate(x2, y2);
    rotate(angle);
    noStroke();
    fill(col);
    triangle(0, 0, -arrowSize, -arrowSize * 0.45, -arrowSize, arrowSize * 0.45);
    pop();
  }

  // Compatibilité pédagogique avec le code du cours
  drawVelocityVector() {
    this._drawDebugVectors();
  }

  // Wrap autour des bords du canvas
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }
}