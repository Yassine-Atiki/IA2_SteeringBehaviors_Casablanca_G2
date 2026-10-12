// Web Audio natif : une horloge commune pour le son et le plasma.
const InteractiveAudio = (() => {
  const TAU = Math.PI * 2;
  const SMOOTHING = 0.04;
  const MORPH_INTERVAL = 10;
  const MORPH_DURATION = 3;
  const BASS_STEPS = [0, 2, 3, 6, 8, 10, 11, 14];
  const MELODY = [[33, 33, 40, 31, 33, 36, 40, 31], [29, 29, 36, 28, 31, 31, 38, 40]];

  function clamp(value, min, max, fallback = min) {
    const number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
  }

  function pointerParameters(x, y, sampleRate = 48000) {
    const u = clamp(x, 0, 1, 0.5);
    const v = clamp(y, 0, 1, 0.5);
    const pitch = 55 * 2 ** (4 * (1 - v));
    return { modulation: 1 + 19 * u, cutoff: Math.min(120 * 100 ** u, sampleRate * 0.45), pitch, depth: pitch * 0.15 };
  }

  function midiFrequency(note) {
    return 440 * 2 ** ((note - 69) / 12);
  }

  function createMorph(random = Math.random) {
    const between = (min, max) => min + clamp(random(), 0, 1, 0.5) * (max - min);
    const scale = [0, 3, 5, 7, 10]; // Pentatonique mineure : variations harmoniquement compatibles.
    return {
      depth: between(0.06, 0.32), voice: between(0.11, 0.19), resonance: between(0.5, 2.8),
      detune: between(-7, 7), bassLength: between(0.4, 0.9), bassGain: between(0.11, 0.19),
      kickPitch: between(120, 175), snareTone: between(1500, 3200),
      melody: Array.from({ length: 16 }, () => 33 + scale[Math.min(4, Math.floor(between(0, 5)))]),
    };
  }

  function interpolateMorph(previous, next, progress) {
    const amount = clamp(progress, 0, 1);
    const eased = amount * amount * (3 - 2 * amount);
    const result = { melody: amount < 0.5 ? previous.melody : next.melody };
    for (const name of ['depth', 'voice', 'resonance', 'detune', 'bassLength', 'bassGain', 'kickPitch', 'snareTone']) {
      result[name] = previous[name] + (next[name] - previous[name]) * eased;
    }
    return result;
  }

  function stepEvents(step) {
    const local = step % 16;
    const events = [];
    if (local % 4 === 0) events.push({ instrument: 'kick' });
    if (local === 4 || local === 12) events.push({ instrument: 'snare' }, { instrument: 'clap' });
    const index = BASS_STEPS.indexOf(local);
    if (index >= 0) events.push({ instrument: 'bass', note: MELODY[Math.floor(step / 16) % 2][index] });
    return events;
  }

  // Intégrale exacte de la fréquence lissée par setTargetAtTime().
  function phaseAt(clock, time) {
    const elapsed = Math.max(0, time - clock.time);
    const decay = Math.exp(-elapsed / SMOOTHING);
    return {
      phase: clock.phase + TAU * (clock.target * elapsed + (clock.initial - clock.target) * SMOOTHING * (1 - decay)),
      frequency: clock.target + (clock.initial - clock.target) * decay,
    };
  }

  class Engine {
    constructor({ contextFactory = () => new AudioContext(), timers = globalThis, random = Math.random } = {}) {
      this.contextFactory = contextFactory;
      this.timers = timers;
      this.random = random;
      this.context = null;
      this.running = false;
      this.volume = 0.25;
      this.tempo = 124;
      this.pointer = { x: 0.5, y: 0.5 };
      this.sources = new Set();
      this.nodes = new Set();
      this.interval = null;
      this.pendingStop = null;
      this.beats = [];
      this.morphFrom = { depth: 0.15, voice: 0.16, resonance: 0.7, detune: 0, bassLength: 0.72, bassGain: 0.16, kickPitch: 150, snareTone: 2400, melody: MELODY.flat() };
      this.morphTo = this.morphFrom;
      this.morphStart = 0;
      this.nextMorph = Infinity;
      this.morphCount = 0;
    }

    node(node) { this.nodes.add(node); return node; }

    source(source, time, duration) {
      this.sources.add(source);
      this.node(source);
      source.onended = () => { source.disconnect(); this.sources.delete(source); this.nodes.delete(source); };
      source.start(time);
      if (duration !== undefined) source.stop(time + duration);
      return source;
    }

    smooth(parameter, value, time) {
      parameter.setTargetAtTime(value, time, SMOOTHING);
    }

    async start() {
      if (this.pendingStop) await this.pendingStop;
      if (this.running) return;
      if (!this.context) this.context = this.contextFactory();
      await this.context.resume();
      if (this.running) return;
      const context = this.context;
      const time = context.currentTime + 0.02;
      this.master = this.node(context.createGain());
      this.master.gain.setValueAtTime(0, context.currentTime);
      this.master.gain.linearRampToValueAtTime(this.volume, time + 0.03);
      const compressor = this.node(context.createDynamicsCompressor());
      this.master.connect(compressor);
      this.analyser = this.node(context.createAnalyser());
      compressor.connect(this.analyser);
      this.analyser.connect(context.destination);
      this.filter = this.node(context.createBiquadFilter());
      this.filter.type = 'lowpass';
      this.filter.Q.value = 0.7;
      this.filter.connect(this.master);
      const parameters = pointerParameters(this.pointer.x, this.pointer.y, context.sampleRate);
      this.filter.frequency.setValueAtTime(parameters.cutoff, time);
      this.carrier = context.createOscillator();
      this.modulator = context.createOscillator();
      this.depth = this.node(context.createGain());
      const voice = this.node(context.createGain());
      this.voice = voice;
      voice.gain.value = 0.16;
      this.carrier.frequency.setValueAtTime(parameters.pitch, time);
      this.modulator.frequency.setValueAtTime(parameters.modulation, time);
      this.depth.gain.setValueAtTime(parameters.depth, time);
      this.modulator.connect(this.depth);
      this.depth.connect(this.carrier.frequency);
      this.carrier.connect(voice);
      voice.connect(this.filter);
      this.clock = { time, phase: 0, initial: parameters.modulation, target: parameters.modulation };
      this.source(this.carrier, time);
      this.source(this.modulator, time);
      this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.running = true;
      this.morphFrom = this.morphAt(time);
      this.morphTo = this.morphFrom;
      this.morphStart = time;
      this.nextMorph = time + MORPH_INTERVAL;
      this.morphCount = 0;
      this.nextStep = time;
      this.step = 0;
      this.beats = [];
      this.schedule();
      this.interval = this.timers.setInterval(() => this.schedule(), 25);
    }

    setPointer(x, y) {
      this.pointer = { x: clamp(x, 0, 1, 0.5), y: clamp(y, 0, 1, 0.5) };
      if (!this.running) return;
      const time = Math.max(this.context.currentTime, this.clock.time);
      const parameters = pointerParameters(this.pointer.x, this.pointer.y, this.context.sampleRate);
      const current = phaseAt(this.clock, time);
      this.clock = { time, phase: current.phase % TAU, initial: current.frequency, target: parameters.modulation };
      this.smooth(this.modulator.frequency, parameters.modulation, time);
      this.smooth(this.carrier.frequency, parameters.pitch, time);
      this.smooth(this.depth.gain, parameters.pitch * this.morphAt(time).depth, time);
      this.smooth(this.filter.frequency, parameters.cutoff, time);
    }

    setVolume(value) {
      this.volume = clamp(value, 0, 1, 0.25);
      if (this.running) this.smooth(this.master.gain, this.volume, this.context.currentTime);
      return this.volume;
    }

    setTempo(value) { this.tempo = clamp(value, 80, 160, 124); return this.tempo; }

    morphAt(time) {
      return interpolateMorph(this.morphFrom, this.morphTo, (time - this.morphStart) / MORPH_DURATION);
    }

    updateMorph(now) {
      if (now >= this.nextMorph) {
        this.morphFrom = this.morphAt(now);
        this.morphTo = createMorph(this.random);
        this.morphStart = now;
        this.nextMorph += (Math.floor((now - this.nextMorph) / MORPH_INTERVAL) + 1) * MORPH_INTERVAL;
        this.morphCount++;
      }
      if (!this.depth) return;
      const profile = this.morphAt(now);
      const pitch = pointerParameters(this.pointer.x, this.pointer.y).pitch;
      this.smooth(this.depth.gain, pitch * profile.depth, now);
      this.smooth(this.voice.gain, profile.voice, now);
      this.smooth(this.filter.Q, profile.resonance, now);
      this.smooth(this.carrier.detune, profile.detune, now);
    }

    schedule() {
      if (!this.running) return;
      const now = this.context.currentTime;
      this.updateMorph(now);
      // Après une suspension de l'onglet, repartir au présent sans rafale de notes anciennes.
      if (this.nextStep < now - 0.15) this.nextStep = now + 0.02;
      while (this.nextStep < now + 0.12) {
        const duration = 60 / this.tempo / 4;
        for (const event of stepEvents(this.step)) {
          if (event.instrument === 'bass') {
            const noteIndex = Math.floor(this.step / 16) % 2 * 8 + BASS_STEPS.indexOf(this.step % 16);
            event.note = this.morphAt(this.nextStep).melody[noteIndex];
          }
          this.play(event, this.nextStep, duration);
        }
        if (this.step % 4 === 0) this.beats.push(this.nextStep);
        this.step++;
        this.nextStep += duration;
      }
      this.beats = this.beats.filter(time => time > now - 1);
    }

    envelope(time, duration, amplitude, destination) {
      const gain = this.node(this.context.createGain());
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(amplitude, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      gain.gain.setValueAtTime(0, time + duration + 0.005);
      gain.connect(destination);
      return gain;
    }

    play(event, time, stepDuration) {
      const context = this.context;
      const profile = this.morphAt(time);
      const nodes = [];
      const oscillate = (type, frequency, duration, amplitude, destination) => {
        const oscillator = context.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        const gain = this.envelope(time, duration, amplitude, destination);
        nodes.push(gain);
        oscillator.connect(gain);
        this.source(oscillator, time, duration + 0.01);
        return oscillator;
      };
      if (event.instrument === 'kick') {
        const kick = oscillate('sine', profile.kickPitch, 0.3, 0.8, this.master);
        kick.frequency.exponentialRampToValueAtTime(45, time + 0.13);
      } else if (event.instrument === 'bass') {
        oscillate('sawtooth', midiFrequency(event.note), stepDuration * profile.bassLength, profile.bassGain, this.filter);
      } else {
        const clap = event.instrument === 'clap';
        const duration = clap ? 0.18 : 0.16;
        const source = context.createBufferSource();
        source.buffer = this.noise;
        const filter = this.node(context.createBiquadFilter());
        filter.type = 'bandpass';
        filter.frequency.value = clap ? profile.snareTone * 0.7 : profile.snareTone;
        filter.Q.value = 0.6;
        const gain = this.envelope(time, duration, clap ? 0.3 : 0.4, this.master);
        nodes.push(filter, gain);
        if (clap) {
          for (const offset of [0.012, 0.027]) {
            gain.gain.setValueAtTime(0.02, time + offset);
            gain.gain.linearRampToValueAtTime(0.3, time + offset + 0.003);
          }
        } else oscillate('triangle', 180, 0.09, 0.12, this.master);
        source.connect(filter);
        filter.connect(gain);
        this.source(source, time, duration + 0.01);
      }
      // Une source muette termine à la fin de l'instrument et libère ses nœuds.
      const cleanup = context.createConstantSource();
      cleanup.offset.value = 0;
      this.source(cleanup, time, 0.4);
      cleanup.onended = () => {
        for (const node of [...nodes, cleanup]) { node.disconnect(); this.nodes.delete(node); }
        this.sources.delete(cleanup);
      };
    }

    visualState() {
      if (!this.running) return { active: false, phase: 0, beat: 0 };
      const time = this.context.currentTime;
      let beat = 0;
      for (const onset of this.beats) if (time >= onset) beat = Math.max(beat, Math.exp(-(time - onset) * 12));
      return { active: true, phase: phaseAt(this.clock, time).phase % TAU, beat };
    }

    stop() {
      if (this.pendingStop) return this.pendingStop;
      if (!this.running) return Promise.resolve();
      this.running = false;
      this.timers.clearInterval(this.interval);
      this.interval = null;
      const now = this.context.currentTime;
      this.master.gain.cancelAndHoldAtTime(now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.04);
      for (const source of this.sources) source.stop(now + 0.05);
      this.pendingStop = new Promise(resolve => {
        this.timers.setTimeout(async () => {
          for (const node of this.nodes) node.disconnect();
          this.nodes.clear();
          this.sources.clear();
          this.beats = [];
          await this.context.suspend();
          this.pendingStop = null;
          resolve();
        }, 80);
      });
      return this.pendingStop;
    }
  }

  return { Engine, pointerParameters, midiFrequency, stepEvents, phaseAt, SMOOTHING, createMorph, interpolateMorph, MORPH_INTERVAL, MORPH_DURATION };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = InteractiveAudio;
