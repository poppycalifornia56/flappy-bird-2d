const GRAVITY = 0.2;
const JUMP_FORCE = -4;
const PIPE_SPEED = 2;
const PIPE_GAP = 250;
const PIPE_FREQUENCY = 1800;
const BIRD_HEIGHT = 30;
const BIRD_WIDTH = 40;

let sounds = {};
let canvas, ctx;
let bird;
let pipes = [];
let score = 0;
let gameRunning = false;
let gameOver = false;
let gamePaused = false;
let lastPipeTime = 0;
let animationId;
let previewMode = true;

let canJump = true;

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

function loadSounds() {
  const soundFiles = ["swoosh", "wing", "point", "hit", "die"];

  soundFiles.forEach((sound) => {
    sounds[sound] = new Audio(`assets/${sound}.ogg`);
  });
}

function playSound(soundName) {
  if (
    gameRunning ||
    soundName === "swoosh" ||
    soundName === "hit" ||
    soundName === "die"
  ) {
    sounds[soundName].pause();
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch((e) => console.log("Audio play failed:", e));
  }
}

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
      this.jump(true);
    }
  }

  jump(isPreview = false) {
    this.velocity = JUMP_FORCE;
    if (!isPreview && gameRunning) {
      playSound("wing");
    }
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

    const MIN_PIPE_HEIGHT = 40;
    const MAX_PIPE_HEIGHT = canvas.height - PIPE_GAP - MIN_PIPE_HEIGHT;

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
      const safeStartY = canvas.height * 0.2;
      const safeEndY = canvas.height * 0.8 - PIPE_GAP;

      const gapPosition = safeStartY + Math.random() * (safeEndY - safeStartY);

      const clampedGapPosition = Math.max(
        MIN_PIPE_HEIGHT,
        Math.min(gapPosition, MAX_PIPE_HEIGHT)
      );

      if (isTop) {
        this.y = 0;
        this.height = clampedGapPosition;
      } else {
        this.y = clampedGapPosition + PIPE_GAP;
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

function init() {
  loadImages();
  loadSounds();

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  gameOverElement = document.getElementById("gameOver");
  finalScoreElement = document.getElementById("finalScore");
  restartBtn = document.getElementById("restartBtn");
  startScreen = document.getElementById("startScreen");
  startBtn = document.getElementById("startBtn");

  pauseScreen = document.getElementById("pauseScreen");
  if (!pauseScreen) {
    pauseScreen = document.createElement("div");
    pauseScreen.id = "pauseScreen";
    pauseScreen.style.position = "absolute";
    pauseScreen.style.top = "0";
    pauseScreen.style.left = "0";
    pauseScreen.style.width = "100%";
    pauseScreen.style.height = "100%";
    pauseScreen.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    pauseScreen.style.display = "none";
    pauseScreen.style.justifyContent = "center";
    pauseScreen.style.alignItems = "center";
    pauseScreen.style.zIndex = "1000";

    const pauseText = document.createElement("div");
    pauseText.textContent = "PAUSED";
    pauseText.style.color = "white";
    pauseText.style.fontSize = "48px";
    pauseText.style.fontWeight = "bold";
    pauseText.style.textAlign = "center";

    const controlsInfo = document.createElement("div");
    controlsInfo.innerHTML =
      "Press [P] to resume<br>[R] to restart<br>[ESC] to quit";
    controlsInfo.style.color = "#ffffff";
    controlsInfo.style.fontSize = "24px";
    controlsInfo.style.marginTop = "20px";
    controlsInfo.style.textAlign = "center";

    pauseScreen.appendChild(pauseText);
    pauseScreen.appendChild(controlsInfo);

    document.body.appendChild(pauseScreen);
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (canJump) {
        handleJump();
        canJump = false;
      }
    } else if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      handleRestartKey();
    } else if (e.key.toLowerCase() === "p") {
      handlePauseKey();
    } else if (e.key === "Escape") {
      handleQuitKey();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      canJump = true;
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

  const controlsDiv = document.createElement("div");
  controlsDiv.innerHTML =
    "Controls:<br>[SPACE] to Jump/Start<br>[P] to Pause<br>[R] to Restart<br>[ESC] to Quit";
  controlsDiv.style.color = "white";
  controlsDiv.style.fontSize = "18px";
  controlsDiv.style.marginTop = "20px";
  controlsDiv.style.textAlign = "center";
  startScreen.appendChild(controlsDiv);
}

function handleRestartKey() {
  if (gameOver || gameRunning || gamePaused) {
    cancelAnimationFrame(animationId);

    gameRunning = false;
    gameOver = false;
    gamePaused = false;
    score = 0;
    pipes = [];
    bird = new Bird(50, canvas.height / 2);
    lastPipeTime = Date.now();

    gameOverElement.style.display = "none";
    pauseScreen.style.display = "none";

    startGame();
  }
}

function handlePauseKey() {
  if (gameRunning && !gameOver) {
    togglePause();
  }
}

function handleQuitKey() {
  if (gameRunning || gamePaused) {
    if (confirm("Quit game?")) {
      quitGame();
    } else if (gamePaused) {
      togglePause();
    }
  }
}

function togglePause() {
  gamePaused = !gamePaused;

  if (gamePaused) {
    cancelAnimationFrame(animationId);
    pauseScreen.style.display = "flex";
    playSound("swoosh");
  } else {
    pauseScreen.style.display = "none";
    playSound("swoosh");
    gameLoop();
  }
}

function quitGame() {
  cancelAnimationFrame(animationId);
  gameRunning = false;
  gameOver = false;
  gamePaused = false;
  pauseScreen.style.display = "none";
  gameOverElement.style.display = "none";

  previewMode = true;
  previewBird = new Bird(50, canvas.height / 2);
  createPreviewPipes();
  startScreen.style.display = "flex";

  playSound("swoosh");
  previewLoop();
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
    gameOverElement.style.display = "none";
    startGame();
    return;
  }

  if (!gameRunning || gameOver || gamePaused) return;

  bird.jump();
}

function startGame() {
  if (gameRunning) return;

  playSound("swoosh");
  gameOverElement.style.display = "none";
  startScreen.style.display = "none";
  previewMode = false;
  gameRunning = true;
  gameOver = false;
  score = 0;
  pipes = [];
  bird = new Bird(50, canvas.height / 2);
  lastPipeTime = Date.now();
  canJump = true;

  cancelAnimationFrame(animationId);

  gameLoop();
}

function resetGame() {
  gameOverElement.style.display = "none";
  handleRestartKey();
}

function endGame() {
  playSound("hit");
  setTimeout(() => playSound("die"), 500);

  gameRunning = false;
  gameOver = true;
  gameOverElement.style.display = "flex";
  finalScoreElement.textContent = score;
  cancelAnimationFrame(animationId);

  const restartHint = document.createElement("div");
  restartHint.textContent = "Press [R] to restart or [SPACE] to play again";
  restartHint.style.fontSize = "20px";
  restartHint.style.marginTop = "10px";
  restartHint.style.color = "#ffffff";

  const existingHint = gameOverElement.querySelector("div:last-child");
  if (existingHint && existingHint.textContent.includes("Press [R]")) {
    existingHint.textContent = "Press [R] to restart or [SPACE] to play again";
  } else {
    gameOverElement.appendChild(restartHint);
  }

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
      playSound("point");
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

function drawControls() {
  if (gameRunning && !gameOver && !gamePaused) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "14px Arial";
    ctx.fillText(
      "[P] Pause | [R] Restart | [ESC] Quit",
      canvas.width - 220,
      20
    );
  }
}

function checkBoundaries() {
  if (bird.y + bird.height > canvas.height - 20 || bird.y < 0) {
    endGame();
  }
}

function makePreviewBirdJump() {
  const currentTime = Date.now();
  if (currentTime - lastPreviewJump > 1000) {
    previewBird.jump(true);
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
  if (gameOver || gamePaused) return;

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
  drawControls();
  checkBoundaries();

  animationId = requestAnimationFrame(gameLoop);
}

window.onload = init;
