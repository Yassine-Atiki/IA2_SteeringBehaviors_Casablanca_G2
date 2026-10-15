class ArenaUI {
  constructor(actions, audio, effects, parameters) {
    this.actions = actions;
    this.audio = audio;
    this.effects = effects;
    this.parameters = parameters;
    this.mode = 'arcade';
    this.dialog = document.getElementById('settings');
    this.resumeAfterSettings = false;
    this.previousState = null;
    this.toastTimer = null;
    this.ids = new Map();
    document.querySelectorAll('[id]').forEach(el => this.ids.set(el.id, el));
    this.bind();
    this.el('play').disabled = false;
    this.el('play').querySelector('span').textContent = 'PLAY';
    this.el('play').focus();
  }

  el(id) { return this.ids.get(id); }
  text(id, value) { const el = this.el(id); if (el.textContent !== String(value)) el.textContent = value; }
  on(id, callback) {
    this.el(id).addEventListener('click', () => {
      void this.audio.unlock().then(() => this.audio.play('ui'));
      callback();
    });
  }

  bind() {
    this.on('play', () => this.actions.start(this.mode));
    for (const id of ['restart', 'retry']) this.on(id, () => this.actions.start());
    for (const id of ['pause-menu', 'result-menu']) this.on(id, () => this.actions.menu());
    this.el('home').addEventListener('click', event => { event.preventDefault(); this.actions.menu(); });
    this.on('pause', () => this.actions.pause());
    this.on('resume', () => this.actions.resume());
    this.on('sound', () => this.toggleSound());
    this.on('overdrive', () => this.actions.overdrive());
    this.on('add-snake', () => this.actions.add());
    this.on('settings-open', () => this.settings());
    this.on('settings-close', () => this.dialog.close());
    this.dialog.addEventListener('close', () => {
      if (this.resumeAfterSettings && !document.hidden) this.actions.resume();
      this.resumeAfterSettings = false;
    });
    document.querySelectorAll('[data-mode]').forEach(button => {
      button.addEventListener('click', () => {
        this.mode = button.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach(el => {
          el.classList.toggle('selected', el === button);
          el.setAttribute('aria-pressed', String(el === button));
        });
        this.text('mode-guide', this.mode === 'arcade' ? 'Atteignez 3 000 points avant la fin du compte à rebours.' : 'Mouvement libre, plusieurs serpents. Aucune limite de temps.');
        void this.audio.unlock().then(() => this.audio.play('ui'));
      });
    });
    const movement = { 'head-speed': 'maxSpeedTete', 'head-force': 'maxForceTete', 'body-speed': 'maxSpeedAnneaux', 'body-force': 'maxForceAnneaux' };
    for (const [id, key] of Object.entries(movement)) {
      this.el(id).addEventListener('input', event => {
        this.parameters[key] = Number(event.target.value);
        this.text(`${id}-value`, this.parameters[key].toFixed(key.includes('Force') ? 2 : 1));
        this.actions.parameters();
      });
    }
    for (const bus of ['master', 'effects', 'music']) {
      this.el(`${bus}-volume`).addEventListener('input', event => {
        const value = Number(event.target.value);
        this.audio.setVolume(bus, value / 100);
        this.text(`${bus}-volume-value`, `${value}%`);
      });
    }
    this.el('music-enabled').addEventListener('change', event => this.audio.setMusic(event.target.checked));
    this.el('reduced-effects').checked = this.effects.reduced;
    this.el('reduced-effects').addEventListener('change', event => {
      this.effects.reduced = event.target.checked;
      document.body.classList.toggle('reduced', this.effects.reduced);
      this.actions.effects();
    });
    this.el('screen-shake').addEventListener('change', event => { this.effects.shake = event.target.checked; });
    document.addEventListener('keydown', event => this.keyboard(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.resumeAfterSettings = false; this.actions.pause(); this.audio.setActive(false); }
    });
    window.addEventListener('blur', () => { this.resumeAfterSettings = false; this.actions.pause(); this.audio.setActive(false); });
    window.addEventListener('focus', () => {
      if (this.actions.isMenu()) this.audio.setActive(true);
    });
  }

  keyboard(event) {
    const target = event.target;
    if (this.dialog.open) {
      if (event.key.toLowerCase() === 'h' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        event.preventDefault(); this.dialog.close();
      }
      return; // Native dialog handles Escape and focus trapping.
    }
    if (event.key === 'Tab') {
      const overlay = !this.el('pause-screen').hidden ? this.el('pause-screen') : (!this.el('result-screen').hidden ? this.el('result-screen') : null);
      if (overlay) {
        const buttons = Array.from(overlay.querySelectorAll('button'));
        const index = buttons.indexOf(document.activeElement);
        const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault(); buttons[next].focus(); return;
      }
    }
    if (event.repeat || target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === ' ' && ['BUTTON', 'A'].includes(target?.tagName)) return;
    const shortcuts = { h: () => this.settings(), m: () => this.toggleSound(), p: () => this.actions.togglePause(), escape: () => this.actions.togglePause(), r: () => this.actions.restart(), ' ': () => this.actions.overdrive() };
    if (shortcuts[key]) { event.preventDefault(); void this.audio.unlock(); shortcuts[key](); }
  }

  toggleSound() { this.audio.setMuted(!this.audio.muted); this.updateSound(); }
  updateSound() {
    this.text('sound', this.audio.available ? (this.audio.muted ? 'SON OFF' : 'SON ON') : 'SON INDISP.');
    this.el('sound').setAttribute('aria-pressed', String(this.audio.muted));
    this.el('sound').setAttribute('aria-label', this.audio.muted ? 'Activer le son · M' : 'Couper le son · M');
  }

  settings() {
    if (this.dialog.open) { this.dialog.close(); return; }
    this.resumeAfterSettings = this.actions.isPlaying();
    if (this.resumeAfterSettings) this.actions.pause();
    this.dialog.showModal();
  }

  toast(message) {
    clearTimeout(this.toastTimer);
    this.text('toast', message);
    this.el('toast').classList.add('visible');
    this.toastTimer = setTimeout(() => this.el('toast').classList.remove('visible'), 3000);
  }

  clearFeedback() {
    clearTimeout(this.toastTimer);
    this.el('toast').classList.remove('visible');
    this.el('score-pop').classList.remove('animate');
    this.el('score').parentElement.classList.remove('pulse');
  }

  collection(points, x, y) {
    const pop = this.el('score-pop');
    pop.classList.remove('animate');
    pop.textContent = `+${points}`;
    pop.style.left = `${Math.min(innerWidth - 85, Math.max(15, x + 20))}px`;
    pop.style.top = `${Math.max(70, y - 20)}px`;
    void pop.offsetWidth;
    pop.classList.add('animate');
    const score = this.el('score').parentElement;
    score.classList.remove('pulse'); void score.offsetWidth; score.classList.add('pulse');
  }

  update(session, snakes) {
    if (session.state !== this.previousState) {
      const menu = session.state === 'MENU';
      this.el('menu').hidden = !menu;
      this.el('menu').inert = !menu;
      this.el('hud').hidden = menu;
      this.el('game-toolbar').hidden = menu;
      this.el('game-toolbar').inert = session.state !== 'PLAYING';
      this.el('pause-screen').hidden = session.state !== 'PAUSED';
      this.el('result-screen').hidden = session.state !== 'GAME_OVER';
      document.body.classList.toggle('is-playing', !menu);
      if (session.state === 'PAUSED') this.el('resume').focus();
      if (session.state === 'GAME_OVER') this.el('retry').focus();
      if (menu) this.el('play').focus();
      this.previousState = session.state;
    }
    this.text('score', String(session.score).padStart(6, '0'));
    this.text('best', session.best);
    this.text('mode-label', session.mode === 'arcade' ? 'ARCADE / OBJECTIF 3000' : 'BAC À SABLE / LIBRE');
    const remaining = Math.ceil(session.remaining);
    this.text('timer', session.mode === 'sandbox' ? '∞' : `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`);
    this.el('timer').parentElement.classList.toggle('danger', session.mode === 'arcade' && remaining <= 10);
    const rings = snakes.reduce((count, snake) => count + snake.anneaux.length, 0);
    this.text('cores', `${session.collected} noyaux · ${rings} anneaux`);
    this.text('combo', `×${Math.max(1, session.combo)}`);
    this.el('combo-progress').style.width = `${session.comboLeft / ArenaSession.COMBO_WINDOW * 100}%`;
    const active = session.overdriveLeft > 0;
    this.text('overdrive-label', active ? 'OVERDRIVE / SCORE ×2' : 'OVERDRIVE');
    this.text('charge', active ? `${session.overdriveLeft.toFixed(1)}s` : `${session.charge}%`);
    this.el('energy-progress').style.width = `${active ? session.overdriveLeft / 8 * 100 : session.charge}%`;
    const od = this.el('overdrive');
    od.disabled = session.charge < 100 || active || session.state !== 'PLAYING';
    const label = active ? 'ÉNERGIE LIBÉRÉE' : session.charge === 100 ? 'ACTIVER · SCORE ×2 / 8s' : 'CHARGEZ AVEC 5 NOYAUX';
    if (od.dataset.label !== label) { od.innerHTML = `${label} <kbd>ESPACE</kbd>`; od.dataset.label = label; }
    this.el('add-snake').hidden = session.mode !== 'sandbox';
    this.el('add-snake').disabled = snakes.length >= 6;
    if (session.state === 'GAME_OVER') {
      this.text('result-title', session.won ? 'DOMINATION.' : 'GAME OVER');
      this.text('result-eyebrow', session.won ? 'OBJECTIF ATTEINT / SIGNAL MAXIMAL' : 'SESSION TERMINÉE');
      this.text('result-copy', session.won ? '3 000 points. L’arène est à vous.' : 'Le temps est écoulé. Reconnectez-vous.');
      this.text('final-score', session.score);
      this.text('final-best', session.best);
      this.text('final-combo', `×${Math.max(1, session.highestCombo)}`);
    }
    this.updateSound();
  }
}
