const SnakeControls = (() => {
  const DEFAULTS = Object.freeze({
    snakeCount: 1, ringCount: 12, r: 12, gap: 8, foodInterval: 5,
    headSpeed: 4, headForce: 0.2, headBraking: 100,
    ringSpeed: 5, ringForce: 0.3, ringBraking: 50
  });
  const GLOBAL_FIELDS = ['snakeCount', 'headBraking', 'ringSpeed', 'ringForce', 'ringBraking', 'foodInterval'];

  function resizePopulation(snakes, count, createSnake) {
    const desired = Math.round(snakeParameter(count, snakes.length || 1, 1, 20));
    while (snakes.length < desired) snakes.push(createSnake(snakes.length));
    snakes.length = desired;
  }

  function pointerPosition(event, bounds, canvasWidth, canvasHeight) {
    return createVector(
      Math.min(canvasWidth, Math.max(0, (event.clientX - bounds.left) * canvasWidth / bounds.width)),
      Math.min(canvasHeight, Math.max(0, (event.clientY - bounds.top) * canvasHeight / bounds.height))
    );
  }

  function initialize(doc, settings, onSetting, onDebug) {
    const panel = doc.querySelector('#controls-panel');
    const toggle = doc.querySelector('#ui-toggle');
    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
    for (const name of GLOBAL_FIELDS) {
      const input = doc.querySelector(`#${name}`);
      const output = doc.querySelector(`#${name}-value`);
      input.value = settings[name];
      input.addEventListener('input', () => {
        settings[name] = Number(input.value);
        output.textContent = String(settings[name]);
        onSetting(name, settings[name]);
      });
      output.textContent = String(settings[name]);
    }
    const checkbox = doc.querySelector('#debug-toggle');
    function setDebug(value) { checkbox.checked = value; onDebug(value); }
    checkbox.addEventListener('change', () => setDebug(checkbox.checked));
    doc.addEventListener('keydown', event => {
      if (event.key.toLowerCase() === 'd' && !event.repeat
        && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) {
        setDebug(!checkbox.checked);
      }
    });
  }

  function valueFor(snake, name) {
    return ({ ringCount: snake.rings.length, headSpeed: snake.maxSpeed, headForce: snake.maxForce })[name] ?? snake[name];
  }

  function bindSnakeInput(input, output, snake, name) {
    const refresh = () => {
      const value = valueFor(snake, name);
      if (name === 'ringCount') input.max = Math.max(100, value);
      if (String(input.value) !== String(value)) input.value = value;
      output.textContent = String(value);
    };
    input.addEventListener('input', () => {
      if (name === 'ringCount') snake.setRingCount(Number(input.value));
      else snake.configure({ [name]: name === 'couleur' ? input.value : Number(input.value) });
      refresh();
    });
    refresh();
    return refresh;
  }

  function renderSnakes(doc, snakes) {
    const container = doc.querySelector('#individual-snakes');
    container.replaceChildren();
    const refreshers = [];
    const fields = [
      ['ringCount', 'Longueur (anneaux)', 1, 100, 1],
      ['r', 'Rayon (px)', 4, 30, 1],
      ['gap', 'Espace entre les cercles (px)', 0, 80, 1],
      ['headSpeed', 'Vitesse max de la tête', 0, 40, 0.1],
      ['headForce', 'Force max de la tête', 0, 10, 0.05],
      ['couleur', 'Couleur']
    ];
    snakes.forEach((snake, index) => {
      const card = doc.createElement('fieldset');
      const legend = doc.createElement('legend');
      legend.textContent = `Serpent ${index + 1}`;
      card.append(legend);
      for (const [name, title, min, max, step] of fields) {
        const id = `snake-${index}-${name}`;
        const label = doc.createElement('label');
        label.htmlFor = id;
        label.append(doc.createTextNode(title));
        const output = doc.createElement('output');
        output.setAttribute('for', id);
        output.id = `${id}-value`;
        label.append(output);
        const input = doc.createElement('input');
        input.id = id;
        input.type = name === 'couleur' ? 'color' : 'range';
        if (input.type === 'range') Object.assign(input, { min, max, step });
        refreshers.push(bindSnakeInput(input, output, snake, name));
        card.append(label, input);
      }
      container.append(card);
    });
    return () => refreshers.forEach(refresh => refresh());
  }

  return { DEFAULTS, resizePopulation, pointerPosition, initialize, bindSnakeInput, renderSnakes };
})();
