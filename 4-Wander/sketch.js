let vehicles = [];
let imageFusee;
let debugCheckbox;
let countSlider;
let controls = {};

const DEFAULTS = {
  maxSpeed: 10,
  maxForce: 0.1,
  wanderRadius: 50,
  distanceCercle: 150,
  wanderWeight: 2,
  arriveWeight: 0.5,
  displaceRange: 0.3,
  pathLength: 10
};

function preload() {
  imageFusee = loadImage('./assets/vehicule.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  creerSliderPopulation(1);
  creerSlidersPourProprietesVehicules();
  const mutationButton = createButton('Mutation');
  mutationButton.parent('controls');
  mutationButton.class('mutation-button');
  mutationButton.mousePressed(mutaterTousLesVaisseaux);

  debugCheckbox = createCheckbox('Mode Debug (touche d)', false);
  debugCheckbox.parent('controls');
  debugCheckbox.changed(() => {
    Vehicle.debug = debugCheckbox.checked();
  });
  synchroniserPopulation(1);
  describe('Vaisseaux qui suivent un comportement wander, avec réglages de population, trajectoire et paramètres.');
}

function creerSliderPopulation(initialValue) {
  const row = creerLigneControle('Nombre de vaisseaux', 1, 40, initialValue, 1);
  countSlider = row.slider;
  countSlider.input(() => {
    row.value.html(countSlider.value());
    synchroniserPopulation(Number(countSlider.value()));
  });
}

function creerSlidersPourProprietesVehicules() {
  const sliderSpecs = [
    ['Vitesse max', 'maxSpeed', 1, 20, 1],
    ['Force max', 'maxForce', 0.05, 2, 0.05],
    ['Rayon wander', 'wanderRadius', 5, 100, 5],
    ['Distance wander', 'distanceCercle', 10, 300, 10],
    ['Poids wander', 'wanderWeight', 0, 5, 0.1],
    ['Poids arrive', 'arriveWeight', 0, 5, 0.1],
    ['Displace range', 'displaceRange', 0, 1, 0.01],
    ['Longueur de traînée', 'pathLength', 0, 100, 1]
  ];

  sliderSpecs.forEach(([label, property, min, max, step]) => {
    const row = creerLigneControle(label, min, max, DEFAULTS[property], step);
    controls[property] = row;
    row.slider.input(() => {
      const value = Number(row.slider.value());
      row.value.html(formatter(property, value));
      vehicles.forEach(vehicle => {
        vehicle[property] = value;
        if (property === 'pathLength' && vehicle.path.length > value) {
          vehicle.path.splice(0, vehicle.path.length - value);
        }
      });
    });
  });
}

function creerLigneControle(label, min, max, initialValue, step) {
  const row = createDiv();
  row.parent('controls');
  row.class('control-row');
  const title = createDiv(label);
  title.parent(row);
  title.class('control-label');
  const slider = createSlider(min, max, initialValue, step);
  slider.parent(row);
  slider.elt.setAttribute('aria-label', label);
  const value = createDiv(formatter(label === 'Nombre de vaisseaux' ? 'count' : label, initialValue));
  value.parent(row);
  value.class('control-value');
  return { slider, value };
}

function formatter(property, value) {
  return property === 'displaceRange' || property === 'wanderWeight' || property === 'arriveWeight'
    ? Number(value).toFixed(2)
    : String(value);
}

function synchroniserPopulation(count) {
  ParametresWander.resizePopulation(vehicles, count, () => {
    const vehicle = new Vaisseau(random(width), random(height), imageFusee);
    Object.assign(vehicle, DEFAULTS);
    return vehicle;
  });
}

function mutaterTousLesVaisseaux() {
  vehicles.forEach(vehicle => ParametresWander.mutateVehicle(vehicle));
  Object.entries(controls).forEach(([property, row]) => {
    const average = vehicles.length
      ? vehicles.reduce((sum, vehicle) => sum + vehicle[property], 0) / vehicles.length
      : DEFAULTS[property];
    const step = ParametresWander.definitions[property].step;
    const sliderValue = Math.round(average / step) * step;
    row.slider.value(sliderValue);
    row.value.html(vehicles.length > 1 ? 'variés' : formatter(property, average));
  });
}

function draw() {
  background(0);
  const target = createVector(mouseX, mouseY);
  vehicles.forEach(vehicle => {
    vehicle.applyBehaviors(target);
    vehicle.update();
    vehicle.show();
    vehicle.edges();
  });
}

function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
    debugCheckbox.checked(Vehicle.debug);
  }
}
