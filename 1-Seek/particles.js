// ============================================================
// ParticleSystem — système de particules pour explosions
// Émet des gerbes de particules lumineuses quand un véhicule
// atteint la cible ou quand le prédateur attrape une luciole.
// ============================================================
const ParticleSystem = (() => {
  const MAX_PARTICLES = 200;
  let particles = [];

  // ----------------------------------------------------------
  // Émettre un groupe de particules à une position donnée
  // ----------------------------------------------------------
  function emit(x, y, count, hue, options = {}) {
    const {
      speedMin = 1.5,
      speedMax = 5,
      sizeMin = 2,
      sizeMax = 6,
      decayMin = 0.012,
      decayMax = 0.035,
      hueSpread = 30,
      gravity = 0,
    } = options;

    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: decayMin + Math.random() * (decayMax - decayMin),
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        hue: hue + (Math.random() - 0.5) * hueSpread,
        gravity,
      });
    }
  }

  // ----------------------------------------------------------
  // Émettre des étincelles (particules plus petites et rapides)
  // ----------------------------------------------------------
  function emitSparks(x, y, count, hue) {
    emit(x, y, count, hue, {
      speedMin: 3,
      speedMax: 8,
      sizeMin: 1,
      sizeMax: 3,
      decayMin: 0.03,
      decayMax: 0.06,
      hueSpread: 15,
    });
  }

  // ----------------------------------------------------------
  // Mise à jour de toutes les particules
  // ----------------------------------------------------------
  function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += p.gravity;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function getParticles() {
    return particles;
  }

  function clear() {
    particles = [];
  }

  return Object.freeze({ emit, emitSparks, update, getParticles, clear });
})();

if (typeof module !== "undefined" && module.exports) module.exports = ParticleSystem;
