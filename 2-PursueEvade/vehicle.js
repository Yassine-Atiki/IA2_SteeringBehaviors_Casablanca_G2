class Vehicle {
  static debug = false;

  constructor(x, y) {
    // position du véhicule
    this.pos = createVector(x, y);
    // vitesse du véhicule
    this.vel = createVector(0, 0);
    // accélération du véhicule
    this.acc = createVector(0, 0);
    // vitesse maximale du véhicule
    this.maxSpeed = 10;
    // force maximale appliquée au véhicule
    this.maxForce = 0.25;
    // rayon du véhicule
    this.r = 16;
  }

  /*
   seek est une méthode qui permet de faire se rapprocher le véhicule de la cible passée en paramètre
   */
    seek(target) {
    // on calcule la direction vers la cible
    // C'est l'ETAPE 1 (action : se diriger vers une cible)
    let force = p5.Vector.sub(target, this.pos);

    // Dessous c'est l'ETAPE 2 : le pilotage (comment on se dirige vers la cible)
    // on limite ce vecteur à la longueur maxSpeed
    force.setMag(this.maxSpeed);
    // on calcule la force à appliquer pour atteindre la cible
    force.sub(this.vel);
    // on limite cette force à la longueur maxForce
    force.limit(this.maxForce);
    // on applique la force au véhicule
    return force;
  }

  // comportement de fuite : vitesse désirée opposée à la menace,
  // puis steering = vitesse désirée - vitesse courante.
  flee(target, distanceDeDetection = Infinity) {
    const targetPosition = target.pos || target;
    if (p5.Vector.dist(this.pos, targetPosition) > distanceDeDetection) return createVector(0, 0);
    const desiredVelocity = p5.Vector.sub(this.pos, targetPosition);
    if (desiredVelocity.magSq() === 0) return createVector(0, 0);
    desiredVelocity.setMag(this.maxSpeed);
    const force = p5.Vector.sub(desiredVelocity, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  /* Poursuite d'un point devant la target !
     cette methode renvoie la force à appliquer au véhicule
  */
  pursue(target, predictionDistance = 20, showDebug = Vehicle.debug) {

    if (showDebug) this.drawVector(target.pos, target.vel.copy().mult(10));

    // TODO
    // 1 - calcul de la position future de la cible
    // on fait une copie de la vitesse de la target
    // (pour ne pas modifier la vitesse de la target)
    let targetAhead = target.vel.copy();

    // et on le multiplie par 10 (10 frames)
    // 2 - prediction dans 10 frames = 10 fois la longueur du vecteur
    // (on multiplie le vecteur vitesse par 10)
    // TODO
    targetAhead.mult(predictionDistance);

    // 3 - on positionne  la target au bout de ce vecteur
    // (on ajoute ce vecteur à la position de la target)
    // TODO
    targetAhead.add(target.pos);

    // 4 -dessin du point devant la target
    if (showDebug) {
      fill("green");
      circle(targetAhead.x, targetAhead.y, 16);
    }

    // 6 - appel à seek avec ce point comme cible 
    let force = this.seek(targetAhead);

    // n'oubliez pas, on renvoie la force à appliquer au véhicule !
    return force;
  }

  /*
   * Prédit le point de rapprochement le plus probable de la menace, puis
   * réutilise flee(). La prédiction tient compte du mouvement relatif :
   * elle évite de fuir vers la menace actuelle lorsqu'une prédiction fixe
   * dépasse le point de croisement.
   */
  predictThreatPosition(threat, maxPrediction = 20) {
    const relativePosition = p5.Vector.sub(threat.pos, this.pos);
    const relativeVelocity = p5.Vector.sub(threat.vel, this.vel);
    const relativeSpeedSquared = relativeVelocity.magSq();
    let prediction = 0;
    if (relativeSpeedSquared > 0.0001) {
      prediction = -p5.Vector.dot(relativePosition, relativeVelocity) / relativeSpeedSquared;
      prediction = constrain(prediction, 0, Math.max(0, maxPrediction));
    }
    const predicted = threat.vel.copy().mult(prediction).add(threat.pos);
    // Au point de collision, la direction vers le point prédit est nulle.
    // On revient alors à la position actuelle de la menace.
    if (p5.Vector.dist(this.pos, predicted) < 0.0001) return threat.pos.copy();
    return predicted;
  }

  evade(target, predictionDistance = 20, showDebug = Vehicle.debug) {
    const threatPosition = this.predictThreatPosition(target, predictionDistance);
    if (showDebug) {
      fill("orange");
      circle(threatPosition.x, threatPosition.y, 10);
    }
    return this.flee(threatPosition);
  }

  /**  Fonction de poursuite parfaite (avec le point devant la
  target qui se rapproche quand le poursuiveur se rapproche)
  */
  pursuePerfect(vehicle, showDebug = Vehicle.debug) {
    // Use the Law of Sines (https://en.wikipedia.org/wiki/Law_of_sines)
    // to predict the right collision point
    if (this.maxSpeed <= 0 || vehicle.vel.magSq() === 0) {
      return this.seek(vehicle.pos);
    }
    const speed_ratio = constrain(vehicle.vel.mag() / this.maxSpeed, -0.999, 0.999);
    const target_angle = vehicle.vel.angleBetween(p5.Vector.sub(this.pos, vehicle.pos));
    const my_angle = asin(sin(target_angle) * speed_ratio);
    const dist = this.pos.dist(vehicle.pos);
    const denominator = sin(PI - my_angle - target_angle);
    const prediction = Math.abs(denominator) < 0.0001
      ? 0
      : dist * sin(my_angle) / denominator;
    const target = vehicle.vel.copy().setMag(prediction).add(vehicle.pos);
    
    if (showDebug) {
      drawArrow(vehicle.pos, p5.Vector.mult(vehicle.vel, 20), 'red');
      drawArrow(this.pos, p5.Vector.sub(target, this.pos), 'green');
      fill(0, 255, 0);
      circle(target.x, target.y, 8);
    }
    return this.seek(target);
  }


  // applyForce est une méthode qui permet d'appliquer une force au véhicule
  // en fait on additionne le vecteurr force au vecteur accélération
  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    // on ajoute l'accélération à la vitesse. L'accélération est un incrément de vitesse
    // (accélératiion = dérivée de la vitesse)
    this.vel.add(this.acc);
    // on contraint la vitesse à la valeur maxSpeed
    this.vel.limit(this.maxSpeed);
    // on ajoute la vitesse à la position. La vitesse est un incrément de position, 
    // (la vitesse est la dérivée de la position)
    this.pos.add(this.vel);

    // on remet l'accélération à zéro
    this.acc.set(0, 0);
  }

  // On dessine le véhicule
  show(showDebug = Vehicle.debug) {
    // formes fil de fer en blanc
    stroke(255);
    // épaisseur du trait = 2
    strokeWeight(2);

    // formes pleines en blanc
    fill(255);

    // sauvegarde du contexte graphique (couleur pleine, fil de fer, épaisseur du trait, 
    // position et rotation du repère de référence)
    push();
    // on déplace le repère de référence.
    translate(this.pos.x, this.pos.y);
    // et on le tourne. heading() renvoie l'angle du vecteur vitesse (c'est l'angle du véhicule)
    rotate(this.vel.heading());

    // Dessin d'un véhicule sous la forme d'un triangle. Comme s'il était droit, avec le 0, 0 en haut à gauche
    triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    // Que fait cette ligne ?
    //this.edges();

    // draw velocity vector
    pop();
    if (showDebug) this.drawVector(this.pos, this.vel.copy().mult(10));
  }

  drawVector(pos, v) {
    push();
    // Dessin du vecteur depuis pos comme origne
    strokeWeight(3);
    stroke("red");
    line(pos.x, pos.y, pos.x + v.x, pos.y + v.y);
    // dessine une petite fleche au bout du vecteur vitesse
    let arrowSize = 5;
    translate(pos.x + v.x , pos.y + v.y);
    rotate(v.heading());
    translate(-arrowSize / 2, 0);
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
  }

  // que fait cette méthode ?
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

// draw an arrow for a vector at a given base position
function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(3);
  fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 7;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}
