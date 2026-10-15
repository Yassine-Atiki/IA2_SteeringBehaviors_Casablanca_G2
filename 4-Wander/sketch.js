let vehicles = [];
let imageFusee;
let debugCheckbox;
const controls = {};

// Vitesse/force par image, cercle en pixels, displaceRange en radians,
// pathLength en nombre de points (un point toutes les cinq images).
const parameterSpecs = {
  maxSpeed: { label: 'Vitesse max', min: 1, max: 20, initial: 10, step: 1 },
  maxForce: { label: 'Force max', min: 0.05, max: 2, initial: 0.1, step: 0.05 },
  wanderRadius: { label: 'Rayon wander', min: 5, max: 100, initial: 50, step: 5 },
  distanceCercle: { label: 'Distance wander', min: 10, max: 300, initial: 150, step: 10 },
  displaceRange: { label: 'displaceRange', min: 0, max: 1, initial: 0.3, step: 0.01 },
  pathLength: { label: 'Traînée (points)', min: 0, max: 200, initial: 10, step: 1 }
};

function preload() {
  imageFusee = loadImage('./assets/vehicule.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  describe('Vaisseaux en déplacement wander, avec une traînée de points et des paramètres réglables.');
  creerControles();
  reglerNombreVehicules(20);
}

function normaliserParametre(value, spec) {
  const number = Number(value);
  const bounded = Math.max(spec.min, Math.min(spec.max,
    Number.isFinite(number) ? number : spec.initial));
  const snapped = spec.min + Math.round((bounded - spec.min) / spec.step) * spec.step;
  return Number(Math.max(spec.min, Math.min(spec.max, snapped)).toFixed(2));
}

function reglerNombreVehicules(value) {
  const number = Number(value);
  const count = Math.max(0, Math.min(200, Number.isFinite(number) ? Math.round(number) : 20));
  // Conserver les vaisseaux existants, leurs directions et leurs traînées.
  if (vehicles.length > count) vehicles.splice(count);
  while (vehicles.length < count) {
    const vehicle = new WanderVehicle(random(width), random(height), imageFusee);
    for (const [property, spec] of Object.entries(parameterSpecs)) {
      vehicle[property] = normaliserParametre(controls[property]?.input.value ?? spec.initial, spec);
    }
    vehicles.push(vehicle);
  }
  controls.count.input.value = count;
  controls.count.output.textContent = count;
  afficherValeurs();
}

function reglerParametre(property, value) {
  const normalized = normaliserParametre(value, parameterSpecs[property]);
  controls[property].input.value = normalized;
  for (const vehicle of vehicles) {
    vehicle[property] = normalized;
    if (property === 'pathLength') vehicle.trimPath();
  }
  afficherValeurs();
}

function muterVehicules(randomValue = Math.random) {
  for (const vehicle of vehicles) {
    for (const [property, spec] of Object.entries(parameterSpecs)) {
      // Variation additive indépendante : ±20 % de la plage autorisée.
      const delta = (randomValue() * 2 - 1) * (spec.max - spec.min) * 0.2;
      vehicle[property] = normaliserParametre(vehicle[property] + delta, spec);
    }
    vehicle.vel.limit(vehicle.maxSpeed);
    vehicle.trimPath();
  }
  afficherValeurs();
}

function afficherValeurs() {
  for (const [property, spec] of Object.entries(parameterSpecs)) {
    const control = controls[property];
    if (!control) continue;
    const digits = spec.step < 1 ? 2 : 0;
    if (vehicles.length === 0) {
      control.output.textContent = Number(control.input.value).toFixed(digits);
      continue;
    }
    const values = vehicles.map(vehicle => vehicle[property]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    control.output.textContent = min === max ? min.toFixed(digits)
      : `${min.toFixed(digits)} – ${max.toFixed(digits)}`;
  }
}

function creerCurseur(panel, property, spec, callback) {
  const row = document.createElement('div');
  row.className = 'control-row';
  const label = document.createElement('label');
  label.htmlFor = `slider-${property}`;
  label.textContent = spec.label;
  const input = document.createElement('input');
  input.type = 'range';
  input.id = label.htmlFor;
  input.min = spec.min;
  input.max = spec.max;
  input.step = spec.step;
  input.value = spec.initial;
  const output = document.createElement('output');
  output.htmlFor = input.id;
  output.textContent = spec.initial;
  input.addEventListener('input', () => callback(Number(input.value)));
  row.append(label, input, output);
  panel.append(row);
  controls[property] = { input, output };
}

function creerControles() {
  const panel = document.createElement('section');
  panel.id = 'controls';
  panel.setAttribute('aria-label', 'Paramètres des vaisseaux');
  creerCurseur(panel, 'count',
    { label: 'Vaisseaux', min: 0, max: 200, initial: 20, step: 1 }, reglerNombreVehicules);
  for (const [property, spec] of Object.entries(parameterSpecs)) {
    creerCurseur(panel, property, spec, value => reglerParametre(property, value));
  }
  const button = document.createElement('button');
  button.id = 'mutation';
  button.textContent = 'Mutation';
  button.addEventListener('click', () => muterVehicules());
  const help = document.createElement('p');
  help.textContent = 'Mutation : ±20 % de chaque plage, par vaisseau. Valeurs affichées : min–max. Un curseur applique sa valeur à tous ; les nouveaux vaisseaux prennent les valeurs des curseurs.';
  const debugLabel = document.createElement('label');
  debugCheckbox = document.createElement('input');
  debugCheckbox.type = 'checkbox';
  debugCheckbox.addEventListener('change', () => { Vehicle.debug = debugCheckbox.checked; });
  debugLabel.append(debugCheckbox, document.createTextNode(' Mode debug (touche d)'));
  panel.append(button, debugLabel, help);
  document.body.append(panel);
}

function draw() {
  background(0);
  for (const vehicle of vehicles) {
    // La base retourne la force de wander sans l'appliquer elle-même.
    vehicle.applyForce(vehicle.wander());
    vehicle.update();
    vehicle.show();
    vehicle.edges();
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
    debugCheckbox.checked = Vehicle.debug;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
