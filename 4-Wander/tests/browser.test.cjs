const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

test('intégration navigateur avec p5.js embarqué', { timeout: 30000 }, async () => {
  const browser = process.env.WANDER_BROWSER || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(file => fs.existsSync(file));
  assert.ok(browser, 'Définir WANDER_BROWSER vers Chrome/Edge pour cette validation.');
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wander-browser-'));
  let child;
  try {
    let output = '';
    let errors = '';
    child = spawn(browser, ['--headless', '--disable-gpu', '--no-first-run',
      `--user-data-dir=${profile}`, '--dump-dom', '--virtual-time-budget=8000',
      `http://127.0.0.1:${server.address().port}/tests/browser.html`]);
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { errors += data; });
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Délai navigateur dépassé')); }, 25000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', value => { clearTimeout(timer); resolve(value); });
    });
    assert.equal(code, 0, errors.slice(-1500));
    assert.match(output, /id="result">PASS:/, output.slice(0, 2000));
  } finally {
    if (child && child.exitCode === null) child.kill();
    await new Promise(resolve => server.close(resolve));
    // Profil éphémère conservé dans le dossier temporaire du système.
  }
});
