// survivalMode.js
// ============================
// CHAOS KEYBOARD BATTLE - SURVIVAL MODE (Updated)
// ============================

let canvas, ctx;
let paused = false;
let gameOverState = false;
let startTime = 0;
let enemySpawnInterval, powerUpSpawnInterval;
let currentSpawnRate = 2000;

// Audio (assumes files exist in 'sounds/' directory)
const shootSound = new Audio('sounds/shoot.mp3');
const hitSound = new Audio('sounds/hit.mp3');
const shieldSound = new Audio('sounds/shield.mp3');
const gameOverSound = new Audio('sounds/gameover.mp3');

// Collections
const enemyBullets = [];
const enemies = [];
const powerUps = [];

// Player setup
const player = {
  name: 'Player',
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  vx: 0,
  vy: 0,
  acceleration: 0.5,
  friction: 0.8,
  baseSpeed: 5,
  health: 100,
  shieldHealth: 100,
  score: 0,
  bullets: [],
  shieldActive: false,
  dashCooldown: 0,
  lastShot: 0,
};

// Controls state
const keys = {};

// Attach key listeners
function attachEventListeners() {
  document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

// Enemy spawn
function spawnEnemy() {
  const enemy = {
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 50,
    speed: Math.random() * 2 + 1 + getWave() * 0.2,
    health: 30 + getWave() * 5,
    lastShot: Date.now(),
  };
  enemies.push(enemy);
}

// Power-up spawn
function spawnPowerUp() {
  const types = ["health", "shield", "speed", "bullet"];
  const type = types[Math.floor(Math.random() * types.length)];
  const powerUp = {
    x: Math.random() * (canvas.width - 30),
    y: Math.random() * (canvas.height - 30),
    width: 30,
    height: 30,
    type: type,
    spawnTime: Date.now(),
    duration: 7000 // disappears after 7 seconds
  };
  powerUps.push(powerUp);
}

// Shoot
function shootBullet() {
  shootSound.currentTime = 0;
  shootSound.play();
  player.bullets.push({
    x: player.x + player.width / 2 - 5,
    y: player.y,
    width: 10,
    height: 10,
    speed: 6,
  });
}

// Dash
function dash() {
  if (player.dashCooldown <= 0) {
    player.vx *= 2;
    player.vy *= 2;
    player.dashCooldown = 2000;
    setTimeout(() => {
      player.vx = 0;
      player.vy = 0;
    }, 300);
  }
}

// Collision check
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Calculate current wave
function getWave() {
  const elapsed = Date.now() - startTime;
  return Math.floor(elapsed / 30000) + 1;
}

// Adjust spawn rate based on wave
function adjustSpawnRate() {
  const newRate = Math.max(500, 2000 - getWave() * 100);
  if (newRate !== currentSpawnRate) {
    currentSpawnRate = newRate;
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, currentSpawnRate);
  }
}

// Main update loop
function update() {
  if (paused) return;

  adjustSpawnRate();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const wave = getWave();

  // Movement with acceleration & friction
  if (keys["a"]) player.vx -= player.acceleration;
  if (keys["d"]) player.vx += player.acceleration;
  if (keys["w"]) player.vy -= player.acceleration;
  if (keys["s"]) player.vy += player.acceleration;
  player.vx *= player.friction;
  player.vy *= player.friction;
  player.x += player.vx;
  player.y += player.vy;
  // Clamp to bounds
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.width > canvas.width) { player.x = canvas.width - player.width; player.vx = 0; }
  if (player.y < 0) { player.y = 0; player.vy = 0; }
  if (player.y + player.height > canvas.height) { player.y = canvas.height - player.height; player.vy = 0; }

  // Shooting
  if (keys[" "] && Date.now() - player.lastShot > 300) {
    shootBullet();
    player.lastShot = Date.now();
  }

  // Shield toggle
  if (keys["q"] && player.shieldHealth > 0) {
    if (!player.shieldActive) shieldSound.play();
    player.shieldActive = true;
  } else {
    player.shieldActive = false;
  }

  // Dash key
  if (keys["e"]) dash();
  if (player.dashCooldown > 0) player.dashCooldown -= 16;

  // Update player bullets
  player.bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y < 0) player.bullets.splice(i, 1);
  });

  // Handle enemies
  enemies.forEach((enemy, ei) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) return enemies.splice(ei, 1);

    // Enemy shoots
    if (Date.now() - enemy.lastShot > 2000) {
      enemy.lastShot = Date.now();
      enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 5,
        y: enemy.y + enemy.height,
        width: 10,
        height: 10,
        speed: 4,
      });
    }

    // Collision with player
    if (isColliding(player, enemy)) {
      if (player.shieldActive) {
        player.shieldHealth = Math.max(0, player.shieldHealth - 10);
      } else {
        player.health -= 10;
      }
      hitSound.play();
      return enemies.splice(ei, 1);
    }

    // Collision with bullets
    player.bullets.forEach((b, bi) => {
      if (isColliding(b, enemy)) {
        enemy.health -= 20;
        player.bullets.splice(bi, 1);
        if (enemy.health <= 0) {
          player.score += 10;
          enemies.splice(ei, 1);
        }
      }
    });
  });

  // Enemy bullets
  enemyBullets.forEach((b, i) => {
    b.y += b.speed;
    if (b.y > canvas.height) return enemyBullets.splice(i, 1);
    if (isColliding(b, player)) {
      if (player.shieldActive) {
        player.shieldHealth = Math.max(0, player.shieldHealth - 10);
      } else {
        player.health -= 10;
      }
      hitSound.play();
      enemyBullets.splice(i, 1);
    }
  });

  // Power-ups
  powerUps.forEach((pu, i) => {
    // Expire
    if (Date.now() - pu.spawnTime > pu.duration) return powerUps.splice(i, 1);

    // Collect
    if (isColliding(player, pu)) {
      if (pu.type === "health") player.health = Math.min(100, player.health + 20);
      if (pu.type === "shield") { player.shieldHealth = 100; }
      if (pu.type === "speed") player.acceleration += 0.2;
      if (pu.type === "bullet") player.bullets.forEach(b => b.speed += 2);
      powerUps.splice(i, 1);
      return;
    }

    // Draw power-up box
    ctx.fillStyle = "yellow";
    ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
    // Draw name and countdown
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    const timeLeft = Math.ceil((pu.duration - (Date.now() - pu.spawnTime)) / 1000);
    ctx.fillText(pu.type.toUpperCase(), pu.x + pu.width/2, pu.y - 10);
    ctx.fillText(`${timeLeft}s`, pu.x + pu.width/2, pu.y + pu.height + 15);
    ctx.textAlign = "left";
  });

  // --- Draw Section ---
  // Player
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if (player.shieldActive) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width, 0, Math.PI*2);
    ctx.stroke();
  }

  // Player bullets
  ctx.fillStyle = "red";
  player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Enemies
  ctx.fillStyle = "green";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));

  // Enemy bullets
  ctx.fillStyle = "orange";
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // UI Panel & Stats
  ctx.shadowColor = "black";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  const timerSeconds = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText(`Health: ${player.health}`, 10, 30);
  ctx.fillText(`Score: ${player.score}`, 10, 60);
  ctx.fillText(`Wave: ${wave}`, 10, 90);
  ctx.fillText(`Time: ${timerSeconds}s`, 10, 120);
  ctx.textAlign = "right";
  ctx.fillText(`Shield: ${player.shieldHealth}%`, canvas.width - 10, 30);
  ctx.textAlign = "left";
  ctx.shadowBlur = 0;

  // Controls instructions (center bottom)
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("WASD: Move  |  SPACE: Shoot  |  Q: Shield  |  E: Dash", canvas.width/2, canvas.height - 20);
  ctx.textAlign = "left";

  // Check Game Over
  if (player.health <= 0) {
    gameOver();
    return;
  }

  requestAnimationFrame(update);
}

// Game Over screen
function gameOver() {
  gameOverState = true;
  gameOverSound.play();
  ctx.fillStyle = "red";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  const survivalTime = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText(`${player.name} Survived ${survivalTime}s!`, canvas.width/2, canvas.height/2);
  ctx.textAlign = "left";
  const goScreen = document.getElementById("gameOverScreen");
  if (goScreen) goScreen.classList.remove("hidden");
}

// Start Survival Mode
function survivalStartGame() {
  // Clear existing intervals
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpSpawnInterval);

  // Get player name if provided
  const nameInput = document.getElementById("playerNameInput");
  player.name = nameInput?.value.trim() || "Player";

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  attachEventListeners();

  // Reset player state
  player.x = canvas.width/2 - 25;
  player.y = canvas.height - 100;
  player.vx = 0; player.vy = 0;
  player.health = 100;
  player.shieldHealth = 100;
  player.score = 0;
  player.bullets = [];
  player.shieldActive = false;
  player.acceleration = 0.5;
  player.dashCooldown = 0;
  player.lastShot = 0;

  // Clear arrays
  enemies.length = 0;
  enemyBullets.length = 0;
  powerUps.length = 0;
  gameOverState = false;
  paused = false;

  // Reset timers
  startTime = Date.now();
  currentSpawnRate = 2000;
  enemySpawnInterval = setInterval(spawnEnemy, currentSpawnRate);
  powerUpSpawnInterval = setInterval(spawnPowerUp, 10000);

  // Begin loop
  requestAnimationFrame(update);
}

/* ===== BUTTON FUNCTIONS ===== */
function togglePause() {
  paused = !paused;
  const ps = document.getElementById("pauseScreen");
  if (ps) {
    if (paused) ps.classList.remove("hidden");
    else ps.classList.add("hidden");
  }
  if (paused) {
    clearInterval(enemySpawnInterval);
    clearInterval(powerUpSpawnInterval);
  } else if (!gameOverState) {
    enemySpawnInterval = setInterval(spawnEnemy, currentSpawnRate);
    powerUpSpawnInterval = setInterval(spawnPowerUp, 10000);
    requestAnimationFrame(update);
  }
}

function restartGame() {
  location.reload();
}

function playAgain() {
  const go = document.getElementById("gameOverScreen");
  if (go) go.classList.add("hidden");
  survivalStartGame();
}

// Expose globally
window.survivalStartGame = survivalStartGame;
window.togglePause = togglePause;
window.restartGame = restartGame;
window.playAgain = playAgain;
