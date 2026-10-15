// ============================================================
// weapons.js — Canons d'Avion de Guerre du Prédateur 💥🛩️
// Canons d'ailes jumeaux tirant des rafales de balles traçantes
// haute vélocité avec flashes à la bouche du canon, traînées
// lumineuses, impact destructeur et bruitages balistiques.
// ============================================================
const PredatorWeapons = (() => {
  const bullets = [];
  const muzzleFlashes = [];
  let burstCounter = 0;
  let burstShotsLeft = 0;
  let burstCooldown = 0;
  let barrelToggle = false;

  // Synthétiseur sonore natif pour coups de feu de mitrailleuse
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) {
        audioCtx = new AudioClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playGunshotSound() {
    try {
      if (!audioCtx) initAudio();
      if (!audioCtx || audioCtx.state !== 'running') return;

      const now = audioCtx.currentTime;

      // 1) Clac percutant (bruit blanc filtré)
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.035);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, now);
      filter.Q.setValueAtTime(3.0, now);

      // 2) Impact balistique (décroissance de fréquence rapide)
      const osc = audioCtx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.045);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start(now);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  // Déclencher un tir d'autocanon
  function fireBullet(predator) {
    playGunshotSound();

    let heading = predator.vel.heading();
    let bs = 1.75; // Facteur d'échelle du prédateur

    // Alternance des canons d'ailes (gauche / droite)
    barrelToggle = !barrelToggle;
    let sideOffset = (barrelToggle ? 15 : -15) * bs;
    let forwardOffset = 16 * bs;

    // Position globale du canon
    let gunX = predator.pos.x + Math.cos(heading) * forwardOffset - Math.sin(heading) * sideOffset;
    let gunY = predator.pos.y + Math.sin(heading) * forwardOffset + Math.cos(heading) * sideOffset;

    // Dispersion balistique réaliste
    let spread = (Math.random() - 0.5) * 0.05;
    let bulletSpeed = 16.5;
    let bulletHeading = heading + spread;

    bullets.push({
      x: gunX,
      y: gunY,
      prevX: gunX - Math.cos(bulletHeading) * 8,
      prevY: gunY - Math.sin(bulletHeading) * 8,
      vx: Math.cos(bulletHeading) * bulletSpeed + predator.vel.x * 0.2,
      vy: Math.sin(bulletHeading) * bulletSpeed + predator.vel.y * 0.2,
      life: 52,
      hue: 18 + (Math.random() - 0.5) * 12, // Orange-rouge incendiaire
    });

    // Éclair de tir à la bouche du canon (Muzzle flash)
    muzzleFlashes.push({
      x: gunX,
      y: gunY,
      life: 4,
      size: 9 * bs,
      angle: heading,
    });
  }

  // ── Mise à jour de l'armement ──
  function update(predator, targetVehicles, activeTarget, canvasWidth, canvasHeight) {
    if (!predator) {
      bullets.length = 0;
      muzzleFlashes.length = 0;
      return;
    }

    // 1) Ciblage : trouver la proie la plus proche
    let nearest = null;
    let nearestDist = Infinity;
    for (const v of targetVehicles) {
      if (v === predator) continue;
      let d = p5.Vector.dist(predator.pos, v.pos);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = v;
      }
    }

    // 2) Alignement de tir : si la cible est dans l'axe de visée (< 32°) et à portée (< 480 px)
    if (nearest && nearestDist < 480) {
      let desiredAngle = p5.Vector.sub(nearest.pos, predator.pos).heading();
      let currentAngle = predator.vel.heading();
      let angleDiff = Math.abs(Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle)));

      if (angleDiff < 0.52) { // Cible verrouillée !
        if (burstCooldown <= 0 && burstShotsLeft <= 0) {
          burstShotsLeft = 4; // Rafale de 4 coups
          burstCounter = 0;
        }
      }
    }

    // 3) Cadence de tir dans la rafale
    if (burstShotsLeft > 0) {
      burstCounter++;
      if (burstCounter >= 4) { // Tir tous les 4 frames
        burstCounter = 0;
        fireBullet(predator);
        burstShotsLeft--;
        if (burstShotsLeft <= 0) {
          burstCooldown = 28; // Temps de recharge court entre les rafales
        }
      }
    } else if (burstCooldown > 0) {
      burstCooldown--;
    }

    // 4) Balistique et collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Hors champ
      if (b.life <= 0 || b.x < -30 || b.x > canvasWidth + 30 || b.y < -30 || b.y > canvasHeight + 30) {
        bullets.splice(i, 1);
        continue;
      }

      // Collision avec les chasseurs
      let hit = false;
      for (const v of targetVehicles) {
        if (v === predator) continue;
        let d = dist(b.x, b.y, v.pos.x, v.pos.y);
        if (d < v.r + 6) {
          hit = true;
          // Explosion d'impact
          if (typeof ParticleSystem !== 'undefined') {
            ParticleSystem.emit(v.pos.x, v.pos.y, 22, 10);
            ParticleSystem.emitSparks(v.pos.x, v.pos.y, 14, 40);
          }
          // Destruction et réapparition du vaisseau
          const respawner = typeof TargetFuyante !== 'undefined' ? TargetFuyante : (typeof TargetScene !== 'undefined' ? TargetScene : null);
          if (respawner && respawner.respawnVehicle) {
            respawner.respawnVehicle(v, canvasWidth, canvasHeight, activeTarget);
          }
          break;
        }
      }

      if (hit) {
        bullets.splice(i, 1);
      }
    }

    // 5) Flashes de bouche
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
      muzzleFlashes[i].life--;
      if (muzzleFlashes[i].life <= 0) {
        muzzleFlashes.splice(i, 1);
      }
    }
  }

  // ── Rendu graphique des balles traçantes ──
  function draw() {
    // A) Balles traçantes d'avion de chasse
    for (const b of bullets) {
      let tRatio = b.life / 52;

      // Halo externe rougeoyant
      stroke(b.hue, 90, 100, 45 * tRatio);
      strokeWeight(4.5);
      line(b.prevX, b.prevY, b.x, b.y);

      // Trait traçant orange/rouge vif
      stroke(b.hue, 100, 100, 95);
      strokeWeight(2.5);
      line(b.prevX, b.prevY, b.x, b.y);

      // Pointe blanche incandescente
      stroke(0, 0, 100, 100);
      strokeWeight(1.4);
      let tipX = b.x - (b.x - b.prevX) * 0.35;
      let tipY = b.y - (b.y - b.prevY) * 0.35;
      line(tipX, tipY, b.x, b.y);

      // Petit éclat frontal
      noStroke();
      fill(b.hue, 70, 100, 85);
      circle(b.x, b.y, 3.8);
    }

    // B) Éclairs de tir (Muzzle Flashes)
    for (const mf of muzzleFlashes) {
      push();
      translate(mf.x, mf.y);
      rotate(mf.angle);
      noStroke();

      // Cône de flamme de canon
      fill(25, 100, 100, 85);
      beginShape();
      vertex(0, -mf.size * 0.35);
      vertex(mf.size * 1.4, 0);
      vertex(0, mf.size * 0.35);
      endShape(CLOSE);

      // Noyau blanc
      fill(0, 0, 100, 95);
      circle(0, 0, mf.size * 0.5);
      pop();
    }
  }

  function reset() {
    bullets.length = 0;
    muzzleFlashes.length = 0;
    burstShotsLeft = 0;
    burstCooldown = 0;
  }

  return {
    update,
    draw,
    reset,
    initAudio,
  };
})();
