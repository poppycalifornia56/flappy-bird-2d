const GRAVITY = 0.2;
const JUMP_FORCE = -4;
const PIPE_SPEED = 2;
const PIPE_GAP = 250;
const PIPE_FREQUENCY = 1800;
const BIRD_HEIGHT = 30;
const BIRD_WIDTH = 40;

let canvas, ctx;
let bird;
let pipes = [];
let score = 0;
let gameRunning = false;
let gameOver = false;
let lastPipeTime = 0;
let animationId;
let previewMode = true;

let birdImg;
let pipeImg;
let backgroundImg;
let groundImg;

let gameOverElement;
let finalScoreElement;
let restartBtn;
let startScreen;
let startBtn;

let previewBird;
let previewPipes = [];
let lastPreviewJump = 0;

function loadImages() {
  birdImg = new Image();
  birdImg.src = "assets/bird.png";

  pipeImg = new Image();
  pipeImg.src = "assets/pipe.png";

  backgroundImg = new Image();
  backgroundImg.src = "assets/background.png";

  groundImg = new Image();
  groundImg.src = "assets/ground.png";
}

function init() {
  loadImages();

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  gameOverElement = document.getElementById("gameOver");
  finalScoreElement = document.getElementById("finalScore");
  restartBtn = document.getElementById("restartBtn");
  startScreen = document.getElementById("startScreen");
  startBtn = document.getElementById("startBtn");

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      handleJump();
    }
  });

  restartBtn.addEventListener("click", resetGame);
  startBtn.addEventListener("click", startGame);

  bird = new Bird(50, canvas.height / 2);

  previewBird = new Bird(50, canvas.height / 2);
  createPreviewPipes();

  gameOverElement.style.display = "none";
  startScreen.style.display = "flex";

  previewLoop();
}

class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = BIRD_WIDTH;
    this.height = BIRD_HEIGHT;
    this.velocity = 0;
    this.gravity = GRAVITY;
  }

  draw() {
    ctx.drawImage(birdImg, this.x, this.y, this.width, this.height);
  }

  update(isPreview = false) {
    this.velocity += this.gravity;
    this.y += this.velocity;

    if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }

    if (isPreview && this.y > canvas.height / 2 + 50) {
      this.jump();
    }
  }

  jump() {
    this.velocity = JUMP_FORCE;
  }

  checkCollision(pipe) {
    const BUFFER = 5;
    return (
      this.x + BUFFER < pipe.x + pipe.width - BUFFER &&
      this.x + this.width - BUFFER > pipe.x + BUFFER &&
      ((pipe.isTop && this.y < pipe.height) ||
        (!pipe.isTop && this.y + this.height > pipe.y))
    );
  }
}

class Pipe {
  constructor(x, isTop, isPreview = false) {
    this.x = x;
    this.width = 60;
    this.isTop = isTop;
    this.isPreview = isPreview;

    const MIN_PIPE_HEIGHT = 50;
    const availableSpace = canvas.height - PIPE_GAP - 2 * MIN_PIPE_HEIGHT;

    if (isPreview) {
      const gapPosition = canvas.height / 2 - PIPE_GAP / 2;
      if (isTop) {
        this.y = 0;
        this.height = gapPosition;
      } else {
        this.y = gapPosition + PIPE_GAP;
        this.height = canvas.height - this.y;
      }
    } else {
      const gapPosition = MIN_PIPE_HEIGHT + Math.random() * availableSpace;
      if (isTop) {
        this.y = 0;
        this.height = gapPosition;
      } else {
        this.y = gapPosition + PIPE_GAP;
        this.height = canvas.height - this.y;
      }
    }

    this.passed = false;
  }

  draw() {
    if (this.isTop) {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.height / 2);
      ctx.scale(1, -1);
      ctx.drawImage(
        pipeImg,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      ctx.restore();
    } else {
      ctx.drawImage(pipeImg, this.x, this.y, this.width, this.height);
    }
  }

  update() {
    this.x -= PIPE_SPEED;

    if (this.isPreview && this.x + this.width < 0) {
      this.x = canvas.width;
    }
  }
}

function createPreviewPipes() {
  const pipe1Top = new Pipe(canvas.width, true, true);
  const pipe1Bottom = new Pipe(canvas.width, false, true);

  const pipe2Top = new Pipe(canvas.width + 200, true, true);
  const pipe2Bottom = new Pipe(canvas.width + 200, false, true);

  previewPipes = [pipe1Top, pipe1Bottom, pipe2Top, pipe2Bottom];
}

function drawBackground() {
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

  const groundY = canvas.height - 20;
  ctx.drawImage(groundImg, 0, groundY, canvas.width, 20);
}

function handleJump() {
  if (previewMode) {
    startGame();
    return;
  }

  if (!gameRunning) return;
  bird.jump();
}

function startGame() {
  startScreen.style.display = "none";
  previewMode = false;
  gameRunning = true;
  gameOver = false;
  score = 0;
  pipes = [];
  bird = new Bird(50, canvas.height / 2);
  lastPipeTime = Date.now();

  cancelAnimationFrame(animationId);
  gameLoop();
}

function resetGame() {
  gameOverElement.style.display = "none";
  startGame();
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  gameOverElement.style.display = "flex";
  finalScoreElement.textContent = score;
  cancelAnimationFrame(animationId);

  setTimeout(() => {
    if (gameOver) {
      previewMode = true;
      previewBird = new Bird(50, canvas.height / 2);
      createPreviewPipes();
      previewLoop();
    }
  }, 3000);
}

function spawnPipes() {
  const currentTime = Date.now();
  if (currentTime - lastPipeTime > PIPE_FREQUENCY) {
    pipes.push(new Pipe(canvas.width, true));
    pipes.push(new Pipe(canvas.width, false));
    lastPipeTime = currentTime;
  }
}

function updatePipes() {
  for (let i = 0; i < pipes.length; i++) {
    pipes[i].update();

    if (
      pipes[i].x + pipes[i].width < bird.x &&
      !pipes[i].passed &&
      !pipes[i].isTop
    ) {
      pipes[i].passed = true;
      score++;
    }

    if (bird.checkCollision(pipes[i])) {
      endGame();
      return;
    }
  }

  pipes = pipes.filter((pipe) => pipe.x + pipe.width > 0);
}

function drawScore() {
  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Score: ${score}`, 20, 40);
}

function checkBoundaries() {
  if (bird.y + bird.height > canvas.height - 20 || bird.y < 0) {
    endGame();
  }
}

function makePreviewBirdJump() {
  const currentTime = Date.now();
  if (currentTime - lastPreviewJump > 1000) {
    previewBird.jump();
    lastPreviewJump = currentTime;
  }
}

function previewLoop() {
  if (!previewMode) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  for (const pipe of previewPipes) {
    pipe.update();
    pipe.draw();
  }

  makePreviewBirdJump();

  previewBird.update(true);
  previewBird.draw();

  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  animationId = requestAnimationFrame(previewLoop);
}

function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  bird.update();
  bird.draw();

  if (gameRunning) {
    spawnPipes();
    updatePipes();
  }

  for (const pipe of pipes) {
    pipe.draw();
  }

  drawScore();
  checkBoundaries();

  animationId = requestAnimationFrame(gameLoop);
}

window.onload = init;
