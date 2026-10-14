const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const context = vm.createContext({ console, window: {} });
  const root = path.join(__dirname, '..');
  for (const file of ['libraries/webaudiox/jsfx/audio.js', 'libraries/webaudiox/jsfx/jsfx.js',
    'libraries/webaudiox/jsfx/jsfxlib.js', 'libraries/webaudiox/webaudiox.js', 'audio.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  return context;
}

test('real JSFX presets generate four distinct, finite, audible signals', () => {
  const context = load();
  const signals = vm.runInContext(`Object.values(PursueAudioPresets).map(preset => jsfx.generate(jsfxlib.arrayToParams(preset)))`, context);
  for (const signal of signals) {
    assert.ok(signal.length > 1000);
    assert.ok(signal.every(Number.isFinite));
    const rms = Math.sqrt(signal.reduce((sum, value) => sum + value * value, 0) / signal.length);
    assert.ok(rms > 0.01, `RMS too low: ${rms}`);
  }
  for (let index = 1; index < signals.length; index++) {
    assert.notDeepEqual(signals[0], signals[index]);
  }
});

test('all JSFX dependencies load before the audio engine in index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const file of ['jsfx/audio.js', 'jsfx/jsfx.js', 'jsfx/jsfxlib.js']) {
    assert.ok(html.indexOf(file) >= 0 && html.indexOf(file) < html.indexOf('src="audio.js"'));
  }
});
