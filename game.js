const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const statusElement = document.querySelector("#status");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const layoutButton = document.querySelector("#layout-button");
const boardElement = document.querySelector(".board-wrap");
const dPadElement = document.querySelector(".d-pad");

const gridSize = 24;
const tileCount = canvas.width / gridSize;
const tickMs = 140;
const bestScoreKey = "snakeBestScore";
const controlLayoutKey = "snakeControlLayout";
const swipeMinDistance = 24;
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const directionOrder = ["up", "right", "down", "left"];
const controlLayouts = [
  { id: "classic", label: "Layout 1", name: "Classic" },
  { id: "row-ldur", label: "Layout 2", name: "Left Down Up Right" },
  { id: "row-udlr", label: "Layout 3", name: "Up Down Left Right" },
  { id: "split-thumbs", label: "Layout 4", name: "Split thumbs" },
  { id: "row-ludr", label: "Layout 5", name: "Left Up Down Right" },
  { id: "wide-double", label: "Layout 6", name: "Wide double row" },
  { id: "grid-4x3", label: "Layout 7", name: "Four by three" },
  { id: "turn-sides", label: "Layout 8", name: "Side turns" },
  { id: "turn-sides-swapped", label: "Layout 9", name: "Side turns swapped" },
  { id: "turn-hybrid", label: "Layout 10", name: "Hybrid turns" },
  { id: "turn-hybrid-inverted", label: "Layout 11", name: "Hybrid turns inverted" },
];

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore = loadBestScore();
let timerId = null;
let state = "ready";
let swipeStart = null;
let controlLayoutIndex = loadControlLayoutIndex();

function resetGame() {
  snake = [
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ];
  direction = directions.right;
  nextDirection = directions.right;
  score = 0;
  food = createFood();
  state = "ready";
  stopTimer();
  updateHud();
  updatePlayButton();
  setStatus("Ready");
  draw();
}

function startGame() {
  if (state === "running") {
    return;
  }

  if (state === "gameover") {
    resetGame();
  }

  state = "running";
  setStatus("");
  updateHud();
  updatePlayButton();
  stopTimer();
  timerId = window.setInterval(tick, tickMs);
}

function togglePause() {
  if (state === "running") {
    state = "paused";
    stopTimer();
    updatePlayButton();
    setStatus("Paused");
    return;
  }

  if (state === "paused") {
    startGame();
  }
}

function handlePlayButton() {
  if (state === "running" || state === "paused") {
    togglePause();
    return;
  }

  startGame();
}

function tick() {
  direction = nextDirection;

  const head = snake[0];
  const nextHead = wrapPosition({
    x: head.x + direction.x,
    y: head.y + direction.y,
  });
  const isEating = nextHead.x === food.x && nextHead.y === food.y;

  if (isSnakeHit(nextHead, !isEating)) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (isEating) {
    score += 10;
    food = createFood();
    updateHud();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  state = "gameover";
  stopTimer();
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }
  updateHud();
  updatePlayButton();
  setStatus(`Game over - Best ${bestScore}`);
  draw();
}

function createFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((part) => part.x === position.x && part.y === position.y));

  return position;
}

function changeDirection(name) {
  const candidate = directions[name];
  if (!candidate) {
    return;
  }

  const isReverse =
    candidate.x + direction.x === 0 && candidate.y + direction.y === 0;

  if (!isReverse) {
    nextDirection = candidate;
  }
}

function handleDirectionInput(name) {
  changeDirection(name);
  if (state === "ready") {
    startGame();
  }
}

function handleTurnInput(turn) {
  const currentDirection = getDirectionName(nextDirection);
  const currentIndex = directionOrder.indexOf(currentDirection);
  const offset = turn === "left" ? -1 : 1;
  const nextIndex = (currentIndex + offset + directionOrder.length) % directionOrder.length;
  handleDirectionInput(directionOrder[nextIndex]);
}

function getSwipeDirection(deltaX, deltaY) {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < swipeMinDistance) {
    return null;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? "right" : "left";
  }

  return deltaY > 0 ? "down" : "up";
}

function draw() {
  ctx.fillStyle = "#202329";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = "#30343b";
  ctx.lineWidth = 1;

  for (let index = 0; index <= tileCount; index += 1) {
    const position = index * gridSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function drawFood() {
  const inset = 5;
  ctx.fillStyle = "#ff5b5f";
  ctx.beginPath();
  ctx.roundRect(
    food.x * gridSize + inset,
    food.y * gridSize + inset,
    gridSize - inset * 2,
    gridSize - inset * 2,
    5
  );
  ctx.fill();
}

function drawSnake() {
  snake.forEach((part, index) => {
    const inset = index === 0 ? 3 : 4;
    ctx.fillStyle = index === 0 ? "#37d67a" : "#22b96a";
    ctx.beginPath();
    ctx.roundRect(
      part.x * gridSize + inset,
      part.y * gridSize + inset,
      gridSize - inset * 2,
      gridSize - inset * 2,
      6
    );
    ctx.fill();
  });
}

function updateHud() {
  scoreElement.textContent = score;
}

function updatePlayButton() {
  if (state === "running") {
    startButton.textContent = "Pause";
    return;
  }

  if (state === "paused") {
    startButton.textContent = "Resume";
    return;
  }

  startButton.textContent = "Start";
}

function setStatus(text) {
  statusElement.textContent = text;
  statusElement.classList.toggle("hidden", text.length === 0);
}

function updateControlLayout() {
  const layout = controlLayouts[controlLayoutIndex];
  document.documentElement.dataset.controlLayout = layout.id;
  dPadElement.dataset.layout = layout.id;
  layoutButton.textContent = layout.label;
  layoutButton.title = `${layout.label}: ${layout.name}`;
  layoutButton.setAttribute(
    "aria-label",
    `Switch touch control layout. Current: ${layout.label}, ${layout.name}`
  );
}

function cycleControlLayout() {
  controlLayoutIndex = (controlLayoutIndex + 1) % controlLayouts.length;
  saveControlLayoutIndex(controlLayoutIndex);
  updateControlLayout();
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function loadBestScore() {
  try {
    return Number(localStorage.getItem(bestScoreKey)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(bestScoreKey, String(value));
  } catch {
    // The game still works when persistent browser storage is unavailable.
  }
}

function loadControlLayoutIndex() {
  try {
    const savedIndex = Number(localStorage.getItem(controlLayoutKey));
    if (
      Number.isInteger(savedIndex) &&
      savedIndex >= 0 &&
      savedIndex < controlLayouts.length
    ) {
      return savedIndex;
    }
  } catch {
    return 0;
  }

  return 0;
}

function saveControlLayoutIndex(value) {
  try {
    localStorage.setItem(controlLayoutKey, String(value));
  } catch {
    // Layout switching remains available even without persistent storage.
  }
}

function wrapPosition(position) {
  return {
    x: (position.x + tileCount) % tileCount,
    y: (position.y + tileCount) % tileCount,
  };
}

function getDirectionName(vector) {
  return directionOrder.find((name) => {
    const directionVector = directions[name];
    return directionVector.x === vector.x && directionVector.y === vector.y;
  });
}

function isSnakeHit(position, ignoreTail = false) {
  const body = ignoreTail ? snake.slice(0, -1) : snake;
  return body.some((part) => part.x === position.x && part.y === position.y);
}

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    handleDirectionInput(keyMap[event.key]);
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (state === "running" || state === "paused") {
      togglePause();
    } else {
      startGame();
    }
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    handleDirectionInput(button.dataset.direction);
  });
});

document.querySelectorAll("[data-turn]").forEach((button) => {
  button.addEventListener("click", () => {
    handleTurnInput(button.dataset.turn);
  });
});

boardElement.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") {
    return;
  }

  event.preventDefault();
  swipeStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  boardElement.setPointerCapture(event.pointerId);
});

boardElement.addEventListener("pointermove", (event) => {
  if (!swipeStart || swipeStart.id !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const directionName = getSwipeDirection(
    event.clientX - swipeStart.x,
    event.clientY - swipeStart.y
  );

  if (directionName) {
    handleDirectionInput(directionName);
    swipeStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }
});

boardElement.addEventListener("pointerup", (event) => {
  if (!swipeStart || swipeStart.id !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const directionName = getSwipeDirection(
    event.clientX - swipeStart.x,
    event.clientY - swipeStart.y
  );
  swipeStart = null;

  if (directionName) {
    handleDirectionInput(directionName);
  }
});

boardElement.addEventListener("pointercancel", () => {
  swipeStart = null;
});

startButton.addEventListener("click", handlePlayButton);
resetButton.addEventListener("click", resetGame);
layoutButton.addEventListener("click", cycleControlLayout);

updateControlLayout();
resetGame();
