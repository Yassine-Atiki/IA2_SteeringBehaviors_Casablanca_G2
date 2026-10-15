class ArenaAudio {
  constructor(contextFactory = null) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.available = true;
    this.muted = false;
    this.masterVolume = 0.45;
    this.effectsVolume = 0.7;
    this.musicVolume = 0.25;
    this.musicEnabled = false;
    this.ambienceAllowed = true;
    this.active = false;
    this.overdrive = false;
    this.voices = new Set();
    this.drone = [];
    this.lastEvent = new Map();
  }

  async unlock() {
    try {
      if (!this.context) {
        const Factory = this.contextFactory || globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Factory) { this.available = false; return false; }
        this.context = this.contextFactory ? Factory() : new Factory();
        this.master = this.context.createGain();
        this.effects = this.context.createGain();
        this.music = this.context.createGain();
        this.effects.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      this.updateGains();
      this.syncMusic();
      return true;
    } catch { this.available = false; return false; }
  }

  updateGains() {
    if (!this.context) return;
    const time = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted || !this.active ? 0 : this.masterVolume, time, 0.01);
    this.effects.gain.setTargetAtTime(this.effectsVolume, time, 0.01);
    this.music.gain.setTargetAtTime(this.musicVolume * (this.overdrive ? 1.25 : 1), time, 0.04);
  }

  setActive(active) {
    this.active = active;
    this.updateGains();
    if (!active) this.stopVoices();
    this.syncMusic();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.stopVoices();
    this.updateGains();
    this.syncMusic();
  }

  setVolume(bus, value) {
    const names = { master: 'masterVolume', effects: 'effectsVolume', music: 'musicVolume' };
    if (!names[bus] || !Number.isFinite(value)) return;
    this[names[bus]] = Math.max(0, Math.min(1, value));
    this.updateGains();
  }

  setMusic(enabled) { this.musicEnabled = Boolean(enabled); this.syncMusic(); }
  setAmbienceAllowed(allowed) { this.ambienceAllowed = Boolean(allowed); this.syncMusic(); }
  setOverdrive(active) { this.overdrive = Boolean(active); this.updateGains(); }

  stopVoices() {
    for (const voice of this.voices) {
      try { voice.osc.stop(); } catch { /* Already ended. */ }
      voice.osc.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }

  reset() { this.stopVoices(); this.lastEvent.clear(); this.setOverdrive(false); }

  syncMusic() {
    const enabled = this.context && this.context.state === 'running' && this.active && this.musicEnabled && this.ambienceAllowed && !this.muted;
    if (!enabled) {
      for (const voice of this.drone) { try { voice.osc.stop(); } catch {} voice.osc.disconnect(); voice.gain.disconnect(); }
      this.drone = [];
      return;
    }
    if (this.drone.length) return;
    for (const hz of [55, 82.4069]) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = 'sine'; osc.frequency.value = hz; gain.gain.value = 0.055;
      osc.connect(gain); gain.connect(this.music); osc.start();
      this.drone.push({ osc, gain });
    }
  }

  play(event) {
    if (!this.context || this.context.state !== 'running' || this.muted || !this.active) return false;
    const now = this.context.currentTime;
    if (now - (this.lastEvent.get(event) ?? -Infinity) < 0.09) return false;
    const notes = {
      ui: [440, 660], collect: [659.25, 987.77, 1318.51], combo: [783.99, 987.77, 1567.98],
      overdrive: [220, 440, 659.25, 880], warning: [220, 207.65],
      gameover: [392, 329.63, 261.63, 164.81], victory: [523.25, 659.25, 783.99, 1046.5]
    }[event];
    if (!notes) return false;
    this.lastEvent.set(event, now);
    const gap = ['gameover', 'victory'].includes(event) ? 0.13 : 0.045;
    notes.forEach((hz, i) => this.note(hz, now + i * gap, event === 'ui' ? 0.08 : 0.22));
    return true;
  }

  note(hz, start, duration) {
    if (this.voices.size >= 12) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(hz, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain); gain.connect(this.effects);
    const voice = { osc, gain };
    this.voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    osc.start(start); osc.stop(start + duration + 0.015);
  }
}
