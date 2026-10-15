// ============================================================
// SpaceBackground — fond étoilé spatial avec parallaxe
// Remplace le plasma psychédélique par un champ d'étoiles,
// des nuages de nébuleuse et des étoiles filantes.
// ============================================================
const SpaceBackground = (() => {
  const MAX_STARS = 350;
  const NEBULA_COUNT = 10;
  const MAX_SHOOTING = 3;

  let stars = [];
  let nebulaBlobs = [];
  let shootingStars = [];
  let initialized = false;

  // ----------------------------------------------------------
  // Création des étoiles réparties sur 3 couches de parallaxe
  // ----------------------------------------------------------
  function createStars(w, h) {
    stars = [];
    for (let i = 0; i < MAX_STARS; i++) {
      const layer = Math.floor(Math.random() * 3); // 0=loin, 1=moyen, 2=proche
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseSize: 0.4 + Math.random() * (layer === 2 ? 3 : layer === 1 ? 2 : 1.2),
        layer,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.03,
        hue: 180 + Math.random() * 120,          // bleu → violet → rose
        saturation: Math.random() * 30,            // plutôt blanc, légère teinte
        baseBrightness: 55 + Math.random() * 45,
      });
    }
  }

  // ----------------------------------------------------------
  // Création des nuages de nébuleuse (ellipses translucides)
  // ----------------------------------------------------------
  function createNebula(w, h) {
    nebulaBlobs = [];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      nebulaBlobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 200 + Math.random() * 400,
        hue: 220 + Math.random() * 80,   // bleu-violet
        alpha: 2.5 + Math.random() * 5,
        driftX: (Math.random() - 0.5) * 0.08,
        driftY: (Math.random() - 0.5) * 0.06,
        ratio: 0.5 + Math.random() * 0.4, // ratio largeur/hauteur
      });
    }
  }

  // ----------------------------------------------------------
  function init(w, h) {
    createStars(w, h);
    createNebula(w, h);
    initialized = true;
  }

  function resize(w, h) {
    if (!initialized) { init(w, h); return; }
    // redistribuer les étoiles au nouveau canvas
    createStars(w, h);
    createNebula(w, h);
  }

  // ----------------------------------------------------------
  // Étoiles filantes — apparition aléatoire
  // ----------------------------------------------------------
  function maybeSpawnShootingStar(w, h) {
    if (shootingStars.length < MAX_SHOOTING && Math.random() < 0.0025) {
      shootingStars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.4,
        angle: 0.3 + Math.random() * 0.5,
        speed: 6 + Math.random() * 10,
        life: 1,
        decay: 0.012 + Math.random() * 0.018,
        length: 50 + Math.random() * 100,
      });
    }
  }

  function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.life -= s.decay;
      if (s.life <= 0) shootingStars.splice(i, 1);
    }
  }

  // ----------------------------------------------------------
  return Object.freeze({
    init,
    resize,
    getStars: () => stars,
    getNebula: () => nebulaBlobs,
    getShootingStars: () => shootingStars,
    maybeSpawnShootingStar,
    updateShootingStars,
  });
})();

if (typeof module !== "undefined" && module.exports) module.exports = SpaceBackground;
