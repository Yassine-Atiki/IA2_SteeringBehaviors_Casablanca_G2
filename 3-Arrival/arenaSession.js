// Time is measured in active-play seconds. This class has no DOM or p5 dependency.
class ArenaSession {
  static COMBO_WINDOW = 7;
  static ROUND_SECONDS = 90;
  static GOAL = 3000;

  constructor(storage = null) {
    this.storage = storage;
    this.state = 'MENU';
    this.mode = 'arcade';
    this.best = this.readBest();
    this.resetValues();
  }

  readBest() {
    try { return Math.max(0, Number(this.storage?.getItem(`neon-serpent-best-${this.mode}`)) || 0); }
    catch { return 0; }
  }

  resetValues() {
    this.score = 0;
    this.collected = 0;
    this.combo = 0;
    this.highestCombo = 0;
    this.comboLeft = 0;
    this.charge = 0;
    this.overdriveLeft = 0;
    this.remaining = ArenaSession.ROUND_SECONDS;
    this.elapsed = 0;
    this.coreId = 0;
    this.won = false;
    this.warned = false;
  }

  start(mode = this.mode) {
    this.mode = mode === 'sandbox' ? 'sandbox' : 'arcade';
    this.best = this.readBest();
    this.resetValues();
    this.state = 'PLAYING';
  }

  tick(seconds) {
    if (this.state !== 'PLAYING' || !Number.isFinite(seconds) || seconds <= 0) return null;
    this.elapsed += seconds;
    this.comboLeft = Math.max(0, this.comboLeft - seconds);
    if (this.comboLeft === 0) this.combo = 0;
    this.overdriveLeft = Math.max(0, this.overdriveLeft - seconds);
    if (this.mode === 'sandbox') return null;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (this.remaining === 0) { this.finish(); return this.won ? 'victory' : 'gameover'; }
    if (!this.warned && this.remaining <= 10) { this.warned = true; return 'warning'; }
    return null;
  }

  // The generation ID is consumed once, even if several heads hit the same core.
  collect(coreId) {
    if (this.state !== 'PLAYING' || coreId !== this.coreId) return null;
    this.coreId++;
    this.combo = this.comboLeft > 0 ? Math.min(5, this.combo + 1) : 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.comboLeft = ArenaSession.COMBO_WINDOW;
    const points = 100 * this.combo * (this.overdriveLeft > 0 ? 2 : 1);
    this.score += points;
    this.collected++;
    if (this.overdriveLeft === 0) this.charge = Math.min(100, this.charge + 20);
    this.saveBest();
    if (this.mode === 'arcade' && this.score >= ArenaSession.GOAL) this.finish();
    return { points, combo: this.combo, milestone: [2, 3, 5].includes(this.combo), won: this.won };
  }

  activateOverdrive() {
    if (this.state !== 'PLAYING' || this.charge < 100 || this.overdriveLeft > 0) return false;
    this.charge = 0;
    this.overdriveLeft = 8;
    return true;
  }

  pause() { if (this.state === 'PLAYING') this.state = 'PAUSED'; }
  resume() { if (this.state === 'PAUSED') this.state = 'PLAYING'; }
  menu() { this.state = 'MENU'; this.resetValues(); }
  finish() {
    this.won = this.score >= ArenaSession.GOAL;
    this.state = 'GAME_OVER';
    this.saveBest();
  }

  saveBest() {
    if (this.score <= this.best) return;
    this.best = this.score;
    try { this.storage?.setItem(`neon-serpent-best-${this.mode}`, String(this.best)); } catch { /* Private browsing is playable. */ }
  }
}

// Bounded rejection sampling, then the clearest sampled position on crowded maps.
function findCorePosition(bounds, parts, radius, randomUnit = Math.random, blockedRects = []) {
  const margin = radius + 14;
  const left = bounds.x + Math.min(margin, bounds.w / 2);
  const top = bounds.y + Math.min(margin, bounds.h / 2);
  const w = Math.max(0, bounds.w - margin * 2);
  const h = Math.max(0, bounds.h - margin * 2);
  let best = { x: left + w / 2, y: top + h / 2 };
  let bestClearance = -Infinity;
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = { x: left + randomUnit() * w, y: top + randomUnit() * h };
    let clearance = Infinity;
    for (const part of parts) {
      clearance = Math.min(clearance, Math.hypot(candidate.x - part.pos.x, candidate.y - part.pos.y) - part.r - radius - 20);
    }
    for (const rect of blockedRects) {
      const dx = Math.max(rect.x - candidate.x, 0, candidate.x - (rect.x + rect.w));
      const dy = Math.max(rect.y - candidate.y, 0, candidate.y - (rect.y + rect.h));
      clearance = Math.min(clearance, Math.hypot(dx, dy) - radius - 12);
    }
    if (clearance > bestClearance) { best = candidate; bestClearance = clearance; }
    if (clearance >= 0) return candidate;
  }
  return best;
}
