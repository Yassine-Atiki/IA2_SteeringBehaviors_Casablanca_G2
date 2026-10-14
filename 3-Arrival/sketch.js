const snakes = [];
const foods = [];
const foodImages = [];
const snakeSettings = { ...SnakeControls.DEFAULTS };
const snakeColors = ['#5ee0af', '#ffcb6b', '#f78cba', '#82aaff', '#c792ea', '#ff846b', '#b6ee78', '#86def0', '#ff89c0', '#efb183', '#a5a4f5', '#eee873', '#e89a9a', '#66cdbb', '#c0c0ed', '#de82e5', '#f39964', '#a4d57b', '#75b8df', '#cbaa8c'];
const foodSpawner = new FoodSpawner();
let pointerTarget;
let refreshSnakeControls = () => {};

function preload() {
  for (const name of ['apple', 'strawberry', 'mouse', 'cheese', 'carrot']) {
    foodImages.push(loadImage(`assets/food/${name}.svg`));
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  pointerTarget = createVector(width * 0.7, height * 0.5);
  SnakeControls.resizePopulation(snakes, snakeSettings.snakeCount, createSnake);
  SnakeControls.initialize(document, snakeSettings, updateSnakeSetting, value => { Vehicle.debug = value; });
  refreshSnakeControls = SnakeControls.renderSnakes(document, snakes);
  canvas.elt.addEventListener('pointermove', event => {
    pointerTarget = SnakeControls.pointerPosition(event, canvas.elt.getBoundingClientRect(), width, height);
  });
  // Quelques nourritures dès l'ouverture, puis une nouvelle toutes les 5 s.
  for (let index = 0; index < 5; index++) spawnFood();
  describe('Des serpents suivent la souris. La nourriture se rapproche quand une tête entre à moins de 100 pixels, puis ajoute un anneau au contact. Chaque serpent possède ses propres réglages.');
}

function createSnake(index) {
  return new Snake(width * 0.4, height * (0.25 + 0.5 * random()), {
    ...snakeSettings, couleur: snakeColors[index]
  });
}

function spawnFood() {
  // Limite de population pour les longues sessions ; aucune suppression forcée.
  if (foods.length >= 100) return;
  const marginX = Math.min(30, width / 2);
  const marginY = Math.min(30, height / 2);
  foods.push(new Nourriture(random(marginX, width - marginX),
    random(marginY, height - marginY), random(foodImages)));
}

function updateSnakeSetting(name, value) {
  if (name === 'snakeCount') {
    SnakeControls.resizePopulation(snakes, value, createSnake);
    refreshSnakeControls = SnakeControls.renderSnakes(document, snakes);
  } else if (name === 'foodInterval') {
    foodSpawner.setInterval(value);
  } else {
    // Réglages communs des anneaux et du freinage seulement. Les paramètres
    // individuels (rayon, longueur, couleur, vitesse, force, écart) sont conservés.
    for (const snake of snakes) snake.configure({ [name]: value });
  }
}

function draw() {
  background('#101827');
  foodSpawner.advance(deltaTime, spawnFood);
  for (const snake of snakes) snake.updateSnake(pointerTarget);
  for (let index = foods.length - 1; index >= 0; index--) {
    const food = foods[index];
    if (!food.tryConsume(snakes)) food.advance(snakes);
    if (food.consumed || food.tryConsume(snakes)) foods.splice(index, 1);
    else food.show();
  }
  for (const snake of snakes) snake.show();
  refreshSnakeControls();
  document.querySelector('#food-count').textContent = String(foods.length);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pointerTarget.x = constrain(pointerTarget.x, 0, width);
  pointerTarget.y = constrain(pointerTarget.y, 0, height);
}
