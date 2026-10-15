// Dependency-free Chrome integration checks via the Chrome DevTools Protocol.
// Usage: node tests/browser-check.cjs (or set CHROME_PATH to another Chromium).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const chromePath = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if (!chromePath) throw new Error('Set CHROME_PATH to an installed Chromium executable.');

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        clearTimeout(pending.timer); this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error))); else pending.resolve(msg.result);
      } else this.events.push(msg);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({id, method, params}));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-serpent-chrome-'));
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.otf':'font/otf' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', '--remote-allow-origins=*', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1440,900', '--user-data-dir=' + profile, 'about:blank'], { windowsHide:true, stdio:['ignore','ignore','pipe'] });
  let cdp;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not expose DevTools: ' + buffer.slice(-2000))), 15000);
      chrome.on('error', reject);
      chrome.stderr.on('data', data => {
        buffer += data.toString();
        const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    const targets = await (await fetch('http://' + new URL(endpoint).host + '/json/list')).json();
    const target = targets.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
    cdp = new CDP(ws);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errors=[]; window.addEventListener('error',e=>window.__errors.push(e.message)); window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));" });
    await cdp.send('Page.navigate', { url:'http://127.0.0.1:' + server.address().port + '/' });
    let passed = 0;
    const check = async (name, expression) => {
      assert.equal(await cdp.evaluate(expression), true, name);
      passed++;
      console.log('PASS ' + name);
    };
    const until = async (expression, timeout = 6000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        try { if (await cdp.evaluate(expression)) return; } catch {}
        await sleep(100);
      }
      throw new Error('Timed out waiting for ' + expression + '\nErrors: ' + await cdp.evaluate('JSON.stringify(window.__errors)'));
    };
    const click = async id => {
      const rect = await cdp.evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await cdp.send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...rect});
      await cdp.send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...rect});
      await sleep(100);
    };
    const key = async (key, code) => {
      await cdp.send('Input.dispatchKeyEvent', { type:'keyDown', key, code });
      await cdp.send('Input.dispatchKeyEvent', { type:'keyUp', key, code });
      await sleep(100);
    };
    const screenshot = async name => {
      fs.mkdirSync(artifacts, {recursive:true});
      const shot = await cdp.send('Page.captureScreenshot', {format:'png'});
      fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
    };
    await until("typeof ui !== 'undefined' && ui && !document.getElementById('play').disabled");
    await sleep(2500);
    await check('menu renders a steering serpent, without creating an audio context', 'session.state === "MENU" && menuSnake.head.vel.mag()>0 && audio.context===null');
    await screenshot('menu-desktop');
    await click('play');
    await until('audio.context && audio.context.state === "running"');
    await check('trusted PLAY starts a real arena', 'session.state==="PLAYING" && serpents.length===1 && !document.getElementById("hud").hidden');
    await check('desktop movement uses the full viewport', 'arenaBounds.x===0 && arenaBounds.y===0 && arenaBounds.w===innerWidth && arenaBounds.h===innerHeight');
    await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved',x:720,y:50});
    await check('mouse crosses the header without being trapped in a smaller arena', 'cibleSouris.y===50');
    await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved',x:720,y:860});
    await check('mouse reaches the bottom of the full-screen arena', 'cibleSouris.y===860');
    await cdp.evaluate('window.initialRings=serpents[0].anneaux.length; nourriture.repositionner(serpents[0].head.pos.x+85,serpents[0].head.pos.y);');
    const core = await cdp.evaluate('({x:nourriture.pos.x,y:nourriture.pos.y})');
    await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved',...core});
    await until('session.collected===1', 8000);
    await check('natural mouse steering collects, scores and grows exactly once', 'session.score===100 && serpents[0].anneaux.length===window.initialRings+1');
    await key('p', 'KeyP');
    await check('P pauses the state and audio', 'session.state==="PAUSED" && !audio.active');
    const frozen = await cdp.evaluate('JSON.stringify({x:serpents[0].head.pos.x,t:session.remaining})');
    await sleep(350);
    assert.equal(await cdp.evaluate('JSON.stringify({x:serpents[0].head.pos.x,t:session.remaining})'), frozen);
    console.log('PASS pause freezes physics and clock');
    passed++;
    await click('resume');
    await cdp.evaluate('window.analyser=audio.context.createAnalyser(); analyser.fftSize=2048; audio.master.connect(analyser); window.samples=new Float32Array(analyser.fftSize); audio.play("collect");');
    await sleep(40);
    await check('actual synthesized audio has a nonzero output waveform', 'analyser.getFloatTimeDomainData(samples); samples.some(x=>Math.abs(x)>0.001)');
    await key('m', 'KeyM'); await sleep(130);
    await check('mute silences the measured output and disconnects voices', 'analyser.getFloatTimeDomainData(samples); audio.muted && audio.voices.size===0 && samples.every(x=>Math.abs(x)<0.0001)');
    await key('m', 'KeyM');
    await cdp.evaluate('audio.play("collect")'); await sleep(40);
    await check('unmute restores real output', 'analyser.getFloatTimeDomainData(samples); !audio.muted && samples.some(x=>Math.abs(x)>0.001)');
    await click('settings-open');
    await check('settings modal pauses gameplay', 'ui.dialog.open && session.state==="PAUSED"');
    await cdp.evaluate('document.getElementById("head-speed").value=7; document.getElementById("head-speed").dispatchEvent(new Event("input",{bubbles:true}));');
    await check('slider input changes real head speed independently', 'serpents[0].head.maxSpeed===7 && serpents[0].anneaux[0].maxSpeed===4');
    await cdp.evaluate('document.getElementById("head-speed").focus()');
    await key('r','KeyR');
    await check('input focus suppresses restart shortcut', 'session.collected===1');
    await screenshot('settings-desktop');
    await click('settings-close');
    await check('closing settings resumes the prior playing state', 'session.state==="PLAYING"');
    await cdp.evaluate('startGame("sandbox"); for(let i=0;i<5;i++){nourriture.repositionner(serpents[0].head.pos.x,serpents[0].head.pos.y);verifierNourriture(serpents[0],session.coreId);}');
    await check('five real collision handlers grow the body and charge Overdrive', 'session.collected===5 && session.charge===100 && serpents[0].anneaux.length===window.initialRings+5');
    await key(' ', 'Space');
    await check('Space activates an earned eight-second Overdrive', 'session.overdriveLeft>7.7 && session.charge===0 && audio.overdrive');
    await cdp.evaluate('nourriture.repositionner(serpents[0].head.pos.x,serpents[0].head.pos.y); verifierNourriture(serpents[0],session.coreId)');
    await check('Overdrive awards a real score bonus without changing physics parameters', 'session.score===2500 && serpents[0].head.maxSpeed===7');
    await screenshot('overdrive-desktop');
    await cdp.evaluate('session.overdriveLeft=0.05;'); await sleep(150);
    await check('Overdrive expires and leaves movement settings intact', 'session.overdriveLeft===0 && !audio.overdrive && serpents[0].head.maxSpeed===7');
    await cdp.evaluate('session.comboLeft=0.03;'); await sleep(180);
    await check('combo expiration resets both the rule and HUD', 'session.combo===0 && document.getElementById("combo").textContent==="\u00d71"');
    await cdp.evaluate('audio.setMusic(true);');
    await sleep(150);
    await check('optional ambience creates two real sustained oscillators', 'audio.drone.length===2');
    await key('m','KeyM'); await sleep(150);
    await check('mute silences sustained ambience too', 'analyser.getFloatTimeDomainData(samples); audio.drone.length===0 && samples.every(x=>Math.abs(x)<0.0001)');
    await key('m','KeyM');
    await check('unmute recreates sustained ambience once', 'audio.drone.length===2');
    await click('add-snake');
    await check('sandbox retains independently moving multiple snakes', 'serpents.length===2 && serpents.every(s=>s instanceof Snake && s.head instanceof Vehicle)');
    await key('r', 'KeyR');
    await check('restart resets snakes, score, combo, Overdrive, particles and trails', 'session.score===0 && session.combo===0 && session.overdriveLeft===0 && session.elapsed<1 && effects.particles.length===0 && serpents.length===1 && serpents[0].anneaux.length===window.initialRings');
    await cdp.evaluate('startGame("arcade"); session.remaining=0.03;'); await sleep(150);
    await check('timeout opens a real game-over overlay', 'session.state==="GAME_OVER" && !session.won && !document.getElementById("result-screen").hidden');
    await cdp.evaluate('audio.unlock()');
    await check('end state keeps the music preference but does not restart its sources', 'audio.musicEnabled && !audio.ambienceAllowed && audio.drone.length===0');
    await screenshot('gameover-desktop');
    await click('retry');
    await check('RETRY starts a fresh round without duplicating canvases', 'session.state==="PLAYING" && session.score===0 && document.querySelectorAll("canvas").length===1');
    await cdp.evaluate('for(let i=0;i<8;i++){nourriture.repositionner(serpents[0].head.pos.x,serpents[0].head.pos.y);verifierNourriture(serpents[0],session.coreId);}');
    await check('goal produces victory and stores the arcade record', 'session.won && session.state==="GAME_OVER" && session.score===3000 && localStorage.getItem("neon-serpent-best-arcade")==="3000"');
    await screenshot('victory-desktop');
    await cdp.evaluate('startGame("sandbox"); for(let i=0;i<5;i++)ajouterSerpent(); for(const s of serpents)while(s.anneaux.length<32)s.ajouterAnneau(); window.perfSamples=[]; window.lastFrame=performance.now(); window.measureFrame=()=>{let now=performance.now();perfSamples.push(now-lastFrame);lastFrame=now;if(perfSamples.length<120)requestAnimationFrame(measureFrame)}; requestAnimationFrame(measureFrame);');
    await until('perfSamples.length>=120', 10000);
    const average = await cdp.evaluate('1000/(perfSamples.slice(10).reduce((a,b)=>a+b,0)/perfSamples.slice(10).length)');
    console.log('MEASURE desktop: 6 snakes / 192 rings, ' + average.toFixed(1) + ' measured FPS (headless Chrome)');
    await check('stress scene stays finite with bounded particle and ring pools', 'serpents.length===6 && effects.particles.length<=effects.cap && effects.rings.length<=8 && serpents.every(s=>[s.head,...s.anneaux].every(p=>Number.isFinite(p.pos.x)&&Number.isFinite(p.pos.y)))');
    await cdp.evaluate('returnToMenu()');
    await cdp.evaluate('window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus"));');
    await check('returning focus restores menu audio while gameplay needs manual resume', 'session.state==="MENU" && audio.active');
    await cdp.send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await sleep(300);
    await check('mobile menu stays within the viewport', 'document.getElementById("play").getBoundingClientRect().right<=innerWidth && document.getElementById("play").getBoundingClientRect().bottom<innerHeight');
    await screenshot('menu-mobile');
    await click('play');
    const touch = await cdp.evaluate('({x:arenaBounds.x+arenaBounds.w*0.7,y:arenaBounds.y+arenaBounds.h*0.6})');
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[touch]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await check('touch maps to arena coordinates', `Math.abs(cibleSouris.x-${touch.x})<2 && Math.abs(cibleSouris.y-${touch.y})<2`);
    await check('mobile movement also uses the full viewport', 'arenaBounds.w===innerWidth && arenaBounds.h===innerHeight && arenaBounds.y===0');
    await check('resize leaves food accessible and every segment finite', 'nourriture.pos.x>arenaBounds.x && nourriture.pos.x<arenaBounds.x+arenaBounds.w && serpents.every(s=>[s.head,...s.anneaux].every(p=>Number.isFinite(p.pos.x)&&Number.isFinite(p.pos.y)))');
    await screenshot('gameplay-mobile');
    await cdp.evaluate('window.dispatchEvent(new Event("blur"))');
    await check('focus loss pauses and silences the arena', 'session.state==="PAUSED" && !audio.active');
    await cdp.evaluate('ui.el("reduced-effects").checked=true; ui.el("reduced-effects").dispatchEvent(new Event("change"));');
    await check('reduced effects enforces particle caps and removes trails', 'effects.reduced && effects.cap===48 && serpents.every(s=>s.trail.length===0)');
    await check('HTTP session has no JavaScript errors', 'window.__errors.length===0');
    await cdp.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await cdp.send('Page.navigate', {url:pathToFileURL(path.join(root,'index.html')).href});
    await until('typeof ui!=="undefined" && ui && !document.getElementById("play").disabled');
    await click('play');
    await check('direct file launch works without a server', 'session.state==="PLAYING" && window.__errors.length===0');
    await check('OS reduced-motion preference is honored on launch', 'effects.reduced && document.getElementById("reduced-effects").checked');
    const errors = cdp.events.filter(e => e.method==='Runtime.exceptionThrown' || (e.method==='Runtime.consoleAPICalled' && e.params.type==='error'));
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log('PASS no runtime exceptions or console errors');
    passed++;
    fs.writeFileSync(path.join(artifacts,'verification.json'), JSON.stringify({date:new Date().toISOString(),checksPassed:passed,browser:chromePath,stress:{snakes:6,rings:192,measuredFps:Number(average.toFixed(1))},errors:[]},null,2));
    console.log('Browser checks passed: ' + passed);
    console.log('Browser artifacts: tests/artifacts/');
  } finally {
    if (cdp) cdp.ws.close();
    chrome.kill();
    server.close();
    await sleep(400);
    // Delete only the exact temporary profile created by this process.
    const resolved = path.resolve(profile);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('neon-serpent-chrome-'));
    try { fs.rmSync(resolved, {recursive:true,force:true}); } catch { /* Chrome may still release its profile. */ }
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
