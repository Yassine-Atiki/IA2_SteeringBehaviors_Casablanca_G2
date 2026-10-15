const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'arenaSession.js'), 'utf8') + '\nthis.ArenaSession = ArenaSession; this.findCorePosition = findCorePosition;', context);
const { ArenaSession, findCorePosition } = context;

test('a core generation scores once even when several snakes collect', () => {
  const s = new ArenaSession(); s.start('sandbox');
  assert.equal(s.collect(0).points, 100);
  assert.equal(s.collect(0), null);
  assert.equal(s.score, 100); assert.equal(s.collected, 1);
  assert.equal(s.collect(-1), null);
  s.pause(); assert.equal(s.collect(1), null);
});

test('combos use a seven-second window, cap at five and expire at exact boundary', () => {
  const s = new ArenaSession(); s.start('sandbox');
  s.collect(0); s.tick(6.99);
  assert.equal(s.collect(1).points, 200);
  s.tick(7); assert.equal(s.combo, 0);
  assert.equal(s.collect(2).points, 100);
  for (let i = 3; i <= 8; i++) s.collect(i);
  assert.equal(s.combo, 5); assert.equal(s.highestCombo, 5);
  s.tick(NaN); s.tick(-1); assert.equal(s.comboLeft, 7);
});

test('Overdrive requires five cores, cannot reactivate, doubles points and expires', () => {
  const s = new ArenaSession(); s.start('sandbox');
  assert.equal(s.activateOverdrive(), false);
  for (let i = 0; i < 4; i++) s.collect(i);
  assert.equal(s.charge, 80); assert.equal(s.activateOverdrive(), false);
  s.collect(4); assert.equal(s.activateOverdrive(), true);
  assert.equal(s.charge, 0); assert.equal(s.overdriveLeft, 8);
  assert.equal(s.activateOverdrive(), false);
  assert.equal(s.collect(5).points, 1000); assert.equal(s.charge, 0);
  s.pause(); s.tick(10); assert.equal(s.overdriveLeft, 8);
  s.resume(); s.tick(8); assert.equal(s.overdriveLeft, 0);
  assert.equal(s.collect(6).points, 100); assert.equal(s.charge, 20);
});

test('arcade wins at its real goal and loses when the active clock expires', () => {
  const s = new ArenaSession(); s.start();
  for (let i = 0; i < 8; i++) s.collect(i);
  assert.equal(s.score, 3000); assert.equal(s.won, true); assert.equal(s.state, 'GAME_OVER');
  assert.equal(s.collect(8), null);
  s.start(); assert.equal(s.tick(80), 'warning');
  assert.equal(s.tick(1), null); assert.equal(s.tick(9), 'gameover');
  assert.equal(s.won, false); assert.equal(s.remaining, 0);
  s.start('sandbox'); s.tick(10000); assert.equal(s.state, 'PLAYING');
});

test('restart and menu clear all temporary session values and keep separate records', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const s = new ArenaSession(storage); s.start('sandbox');
  for (let i = 0; i < 5; i++) s.collect(i);
  s.activateOverdrive(); s.tick(2); s.pause(); s.start('sandbox');
  assert.equal(s.best, 1500);
  for (const key of ['score','collected','combo','highestCombo','comboLeft','charge','overdriveLeft','elapsed','coreId']) assert.equal(s[key], 0);
  assert.equal(s.remaining, 90); assert.equal(s.state, 'PLAYING');
  s.start('arcade'); assert.equal(s.best, 0);
  s.collect(0); s.menu(); assert.equal(s.state, 'MENU'); assert.equal(s.score, 0);
  const badStorage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
  const unavailable = new ArenaSession(badStorage); unavailable.start();
  assert.doesNotThrow(() => unavailable.collect(0)); assert.equal(unavailable.best, 100);
});

test('bounded food positioning avoids body parts and stays within a tiny canvas', () => {
  let samples = [0,0,0.9,0.9];
  const bounds = { x: 10, y: 20, w: 300, h: 200 };
  const parts = [{ pos: { x: 35, y: 45 }, r: 12 }];
  const p = findCorePosition(bounds, parts, 11, () => samples.shift() ?? 0.5);
  assert.ok(Math.hypot(p.x - 35, p.y - 45) > 43);
  assert.ok(p.x >= 35 && p.x <= 285 && p.y >= 45 && p.y <= 195);
  let calls = 0;
  const tiny = findCorePosition({x:0,y:0,w:20,h:20}, [{pos:{x:10,y:10},r:100}], 11, () => { calls++; return 0.5; });
  assert.equal(calls, 160); assert.equal(tiny.x, 10); assert.equal(tiny.y, 10);
});

test('movement covers the complete viewport on desktop, mobile and short screens', () => {
  const scene = vm.createContext({ width: 1440, height: 900, constrain: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  vm.runInContext(fs.readFileSync(path.join(root, 'sketch.js'), 'utf8'), scene);
  for (const [w, h] of [[1440, 900], [390, 844], [844, 390], [320, 240]]) {
    scene.width = w; scene.height = h;
    const bounds = vm.runInContext('getArenaBounds()', scene);
    assert.equal(bounds.x, 0); assert.equal(bounds.y, 0);
    assert.equal(bounds.w, w); assert.equal(bounds.h, h);
  }
});

test('pointer reaches the formerly excluded top and bottom while keeping the head visible', () => {
  const scene = vm.createContext({ width: 1440, height: 900, constrain: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  vm.runInContext(fs.readFileSync(path.join(root, 'sketch.js'), 'utf8'), scene);
  vm.runInContext('session={state:"PLAYING"}; arenaBounds=getArenaBounds(); cibleSouris={set(x,y){this.x=x;this.y=y;}};', scene);
  const event = (x, y) => ({ clientX: x, clientY: y, currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }) } });
  scene.pointerTarget(event(720, 50));
  assert.equal(vm.runInContext('cibleSouris.y', scene), 50);
  scene.pointerTarget(event(720, 860));
  assert.equal(vm.runInContext('cibleSouris.y', scene), 860);
  scene.pointerTarget(event(-100, 1000));
  assert.equal(vm.runInContext('cibleSouris.x', scene), 14);
  assert.equal(vm.runInContext('cibleSouris.y', scene), 886);
});

test('food rejects positions covered by HUD without excluding the entire upper area', () => {
  const bounds = { x: 0, y: 0, w: 1000, h: 800 };
  const panels = [{ x: 0, y: 0, w: 200, h: 160 }];
  const samples = [0, 0, 0.5, 0];
  const p = findCorePosition(bounds, [], 11, () => samples.shift() ?? 0.5, panels);
  assert.equal(p.x, 500); assert.equal(p.y, 25);
});

class AudioParam {
  constructor() { this.value = 0; }
  setTargetAtTime(v) { this.value = v; }
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
}
class AudioNode {
  constructor() { this.gain = new AudioParam(); this.frequency = new AudioParam(); this.connections = []; this.stopped = false; }
  connect(node) { this.connections.push(node); }
  disconnect() { this.connections.length = 0; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
function audioFixture() {
  const ctx = { state:'suspended', currentTime:0, destination:{}, createGain:()=>new AudioNode(), createOscillator:()=>new AudioNode(), async resume() { this.state = 'running'; } };
  const vmContext = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'arenaAudio.js'), 'utf8') + '\nthis.ArenaAudio = ArenaAudio;', vmContext);
  return { audio: new vmContext.ArenaAudio(() => ctx), ctx };
}

test('audio is silent before interaction, clamps volumes and limits rapid events', async () => {
  const { audio, ctx } = audioFixture(); audio.setActive(true);
  assert.equal(audio.context, null); assert.equal(audio.play('collect'), false);
  await audio.unlock(); assert.equal(ctx.state, 'running');
  audio.setVolume('master', 2); assert.equal(audio.masterVolume, 1);
  audio.setVolume('effects', -1); assert.equal(audio.effectsVolume, 0);
  audio.setVolume('effects', NaN); assert.equal(audio.effectsVolume, 0);
  assert.equal(audio.play('collect'), true); assert.equal(audio.voices.size, 3);
  assert.equal(audio.play('collect'), false);
  for (let i=0;i<30;i++) { ctx.currentTime += 0.1; audio.play('collect'); }
  assert.ok(audio.voices.size <= 12);
});

test('mute and pause silence every bus and disconnect sustained and transient sources', async () => {
  const { audio, ctx } = audioFixture(); audio.setActive(true); await audio.unlock();
  audio.setMusic(true); audio.play('combo');
  assert.equal(audio.drone.length, 2); assert.equal(audio.voices.size, 3);
  const sources = [...audio.drone, ...audio.voices];
  audio.setMuted(true);
  assert.equal(audio.master.gain.value, 0); assert.equal(audio.drone.length, 0); assert.equal(audio.voices.size, 0);
  assert.ok(sources.every(v => v.osc.stopped && v.osc.connections.length === 0));
  audio.setMuted(false); assert.equal(audio.drone.length, 2); assert.ok(audio.master.gain.value > 0);
  audio.setActive(false); assert.equal(audio.master.gain.value, 0); assert.equal(audio.drone.length, 0);
  audio.reset(); assert.equal(audio.lastEvent.size, 0);
  audio.setActive(true); ctx.currentTime++; assert.equal(audio.play('collect'), true);
  audio.setAmbienceAllowed(false); assert.equal(audio.drone.length, 0);
  await audio.unlock(); assert.equal(audio.drone.length, 0);
  audio.setAmbienceAllowed(true); assert.equal(audio.drone.length, 2);
});
