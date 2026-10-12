const test = require('node:test');
const assert = require('node:assert/strict');
const Audio = require('../interactive-audio.js');

test('morphing toutes les 10 secondes, progression continue sur trois secondes', () => {
  const engine = new Audio.Engine({ random: () => 0.8 });
  engine.nextMorph = 10;
  const before = engine.morphAt(9.99);
  engine.updateMorph(9.99);
  assert.equal(engine.morphCount, 0);
  engine.updateMorph(10);
  assert.equal(engine.morphCount, 1);
  assert.deepEqual(engine.morphAt(10), before);
  const middle = engine.morphAt(11.5);
  const after = engine.morphAt(13);
  assert.ok(middle.depth > before.depth && middle.depth < after.depth);
  assert.notDeepEqual(after.melody, before.melody);
  engine.updateMorph(19.99);
  assert.equal(engine.morphCount, 1);
  engine.updateMorph(20);
  assert.equal(engine.morphCount, 2);
  assert.equal(engine.nextMorph, 30);
});

test('profils aléatoires reproductibles, notes pentatoniques et profondeur bornée', () => {
  for (const value of [0, 0.5, 1]) {
    const profile = Audio.createMorph(() => value);
    assert.deepEqual(profile, Audio.createMorph(() => value));
    assert.ok(profile.depth >= 0.06 && profile.depth <= 0.32);
    assert.ok(profile.voice <= 0.19);
    assert.ok(profile.melody.every(note => [33, 36, 38, 40, 43].includes(note)));
  }
  const before = Audio.createMorph(() => 0);
  const after = Audio.createMorph(() => 1);
  assert.deepEqual(Audio.interpolateMorph(before, after, 0), before);
  assert.deepEqual(Audio.interpolateMorph(before, after, 1), after);
});

test('X couvre 1–20 Hz, cutoff 120–12000 Hz et Y quatre octaves', () => {
  const left = Audio.pointerParameters(0, 1);
  const right = Audio.pointerParameters(1, 0);
  assert.equal(left.modulation, 1);
  assert.equal(right.modulation, 20);
  assert.equal(left.cutoff, 120);
  assert.equal(right.cutoff, 12000);
  assert.equal(left.pitch, 55);
  assert.equal(right.pitch, 880);
  assert.equal(right.pitch / left.pitch, 16);
  assert.ok(right.depth < right.pitch);
});

test('bornage des coordonnées, valeurs invalides et Nyquist', () => {
  assert.deepEqual(Audio.pointerParameters(-10, 5), Audio.pointerParameters(0, 1));
  assert.deepEqual(Audio.pointerParameters(NaN, NaN), Audio.pointerParameters(0.5, 0.5));
  assert.equal(Audio.pointerParameters(1, 0.5, 16000).cutoff, 7200);
});

test('phase continue lors du passage de 1 à 20 Hz', () => {
  const clock = { time: 0, phase: 0, initial: 1, target: 1 };
  const before = Audio.phaseAt(clock, 0.5);
  const next = { time: 0.5, phase: before.phase, initial: before.frequency, target: 20 };
  assert.equal(Audio.phaseAt(next, 0.5).phase, before.phase);
  assert.equal(Audio.phaseAt(next, 0.5).frequency, 1);
  assert.ok(Audio.phaseAt(next, 1).frequency > 19.99);
  assert.ok(Audio.phaseAt(next, 1).phase > before.phase);
});

test('deux mesures contiennent huit kicks, quatre snares, quatre claps et seize notes', () => {
  const events = Array.from({ length: 32 }, (_, step) => Audio.stepEvents(step)).flat();
  for (const [instrument, count] of [['kick', 8], ['snare', 4], ['clap', 4], ['bass', 16]]) {
    assert.equal(events.filter(event => event.instrument === instrument).length, count);
  }
  assert.equal(Audio.midiFrequency(69), 440);
  assert.notDeepEqual(Audio.stepEvents(0), Audio.stepEvents(16));
});

test('séquenceur régulier aux tempos limites, sans doublon et annulé à l’arrêt', () => {
  for (const tempo of [80, 160]) {
    const engine = new Audio.Engine();
    engine.context = { currentTime: 0 };
    engine.running = true;
    engine.setTempo(tempo);
    engine.nextStep = 0;
    engine.step = 0;
    const times = [];
    engine.play = (event, time) => { if (event.instrument === 'kick') times.push(time); };
    for (let tick = 0; tick < 200; tick++) {
      engine.context.currentTime = tick * 0.025;
      engine.schedule();
    }
    for (let i = 1; i < times.length; i++) assert.ok(Math.abs(times[i] - times[i - 1] - 60 / tempo) < 1e-10);
    const previous = times.length;
    engine.running = false;
    engine.context.currentTime += 1;
    engine.schedule();
    assert.equal(times.length, previous);
    assert.deepEqual(engine.visualState(), { active: false, phase: 0, beat: 0 });
  }
});
