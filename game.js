const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const statusElement = document.querySelector("#status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");

const gridSize = 24;
const tileCount = canvas.width / gridSize;
const tickMs = 115;
const bestScoreKey = "snakeBestScore";
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore = loadBestScore();
let timerId = null;
let state = "ready";

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
  stopTimer();
  timerId = window.setInterval(tick, tickMs);
}

function togglePause() {
  if (state === "running") {
    state = "paused";
    stopTimer();
    setStatus("Paused");
    return;
  }

  if (state === "paused") {
    startGame();
  }
}

function tick() {
  direction = nextDirection;

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };
  const isEating = nextHead.x === food.x && nextHead.y === food.y;

  if (isWallHit(nextHead) || isSnakeHit(nextHead, !isEating)) {
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
  setStatus("Game over");
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
  bestScoreElement.textContent = bestScore;
}

function setStatus(text) {
  statusElement.textContent = text;
  statusElement.classList.toggle("hidden", text.length === 0);
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

function isWallHit(position) {
  return (
    position.x < 0 ||
    position.x >= tileCount ||
    position.y < 0 ||
    position.y >= tileCount
  );
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
    changeDirection(keyMap[event.key]);
    if (state === "ready") {
      startGame();
    }
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
    changeDirection(button.dataset.direction);
    if (state === "ready") {
      startGame();
    }
  });
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", resetGame);

resetGame();
