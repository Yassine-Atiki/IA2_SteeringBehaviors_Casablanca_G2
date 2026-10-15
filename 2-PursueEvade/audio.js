// Timbres adaptés des presets Explosion, Pickup, Hurt et Power Up de la démo WebAudioX.
const PursueAudioPresets = {
  explosion: ["noise",0.0000,0.4000,0.0000,0.3820,0.6090,0.3620,20.0000,975.0000,2400.0000,-0.3940,0.0000,0.0000,0.0100,0.0003,0.0000,0.6300,0.7250,0.0000,0.0000,0.7408,-0.1400,-0.2680,1.0000,0.0000,0.0000,0.0000,0.0000],
  decoy: ["square",0.0000,0.4000,0.0000,0.0280,0.5370,0.3620,20.0000,879.0000,2400.0000,0.0000,0.0000,0.0000,0.0100,0.0003,0.0000,0.3260,0.1140,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000],
  decoyHit: ["saw",0.0000,0.4000,0.0000,0.0540,0.0000,0.1420,20.0000,797.0000,2400.0000,-0.4340,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.2480,0.0000],
  alarm: ["square",0.0000,0.4000,0.0000,0.3440,0.0000,0.3740,20.0000,491.0000,2400.0000,0.2300,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.0795,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000],
};

// Injection du contexte pour tester le vrai rendu avec OfflineAudioContext.
function createPursueAudio(options = {}) {
  let context;
  let output;
  let enabled = false;
  const buffers = {};
  const fleeSources = new Map();
  const sources = new Set();
  const durations = { explosion: 0.4, decoy: 0.2, decoyHit: 0.4, alarm: 0.5 };

  function ensure() {
    if (context) return;
    const helper = options.helper || globalThis.WebAudiox;
    // Vérifier AVANT d'assigner le contexte : un échec ne doit pas laisser
    // un moteur partiellement initialisé avec des buffers vides.
    if (!helper || !globalThis.jsfx || !globalThis.jsfxlib || !globalThis.audio) {
      throw new Error('Les dépendances WebAudioX/JSFX ne sont pas chargées.');
    }
    const next = options.context || new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    for (const [name, original] of Object.entries(PursueAudioPresets)) {
      const preset = original.slice();
      preset[3] = 0.002; // attaque courte, sans clic
      preset[4] = durations[name] * 0.65;
      preset[6] = durations[name] * 0.35;
      if (name === 'alarm') {
        preset[8] = 740;
        preset[10] = 0;
        preset[12] = 0.2;
        preset[13] = 8;
      }
      buffers[name] = helper.getBufferFromJsfx(next, preset);
    }
    const master = next.createGain();
    const compressor = next.createDynamicsCompressor();
    master.gain.value = 0.55;
    master.connect(compressor);
    compressor.connect(options.destination || next.destination);
    output = master;
    context = next;
  }

  function activate() {
    ensure();
    if (context.resume && context.state === 'suspended') context.resume().catch(console.error);
    enabled = true;
    return true;
  }

  function play(name, options = {}) {
    if (!enabled || !buffers[name] || sources.size >= 24) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = options.duration ?? durations[name];
    const volume = options.volume ?? 0.3;
    source.buffer = buffers[name];
    // Ajuster une lecture unique à la durée demandée, sans répéter les silences.
    source.playbackRate.value = source.buffer.duration / duration;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.setValueAtTime(volume, now + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(gain);
    gain.connect(output);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(now);
    source.stop(now + duration);
  }

  function startFlee(target) {
    if (!enabled || fleeSources.has(target)) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 160;
    gain.gain.value = 0.025;
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start();
    fleeSources.set(target, { oscillator, gain });
  }

  function updateFlee(target) {
    const source = fleeSources.get(target);
    if (!source) return;
    const speedRatio = Math.min(1, target.maxSpeed > 0 ? target.vel.mag() / target.maxSpeed : 0);
    source.oscillator.frequency.setTargetAtTime(140 + speedRatio * 900, context.currentTime, 0.03);
  }

  function stopFlee(target) {
    const source = fleeSources.get(target);
    if (!source) return;
    source.gain.gain.setTargetAtTime(0, context.currentTime, 0.01);
    source.oscillator.stop(context.currentTime + 0.05);
    fleeSources.delete(target);
  }

  function toggle() {
    if (!enabled) return activate();
    enabled = false;
    for (const source of sources) source.stop();
    for (const target of fleeSources.keys()) stopFlee(target);
    return false;
  }

  return { activate, toggle, play, startFlee, updateFlee, stopFlee, isEnabled: () => enabled };
}

const PursueEvadeAudio = createPursueAudio();
