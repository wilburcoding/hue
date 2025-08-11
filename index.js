const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { createCanvas, loadImage } = require("canvas");

const PLAYER_THRESH = 1;
const COUNTDOWN_SECONDS = 1;
const GAME_DURATION = 60 * 1000;

app.use(express.static('public'));

/** @type {Record<string, {color: {r: number, g: number, b: number} | null, name: string | null, socket: any}>} */
const players = {};
/** @type {{imageUrl: string, targetColor: {r: number, g: number, b: number}, endTime: number} | null} */
let gameState = null;

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (socket.id in players) {
      delete players[socket.id];
    }
    if (Object.keys(players).length === 0 && gameState) {
      console.log("No players left, ending game...");
      endGame();
    }
  });

  socket.on("join", (data) => {
    const name = data.name;
    console.log(`${name} has joined the room`);
    players[socket.id] = {
      color: null,
      name,
      socket,
    };
    emitUpdate();
    maybeStartGame();
  })

  socket.on("color-change", (data) => {
    const { color } = data;
    if (socket.id in players) {
      players[socket.id].color = color;
    }
    emitUpdate();
  })
});

/** @param {string} imagePath */
async function generateTargetColor(imagePath) {
  const image = await loadImage(imagePath)
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(image, 0, 0)

  const existingColors = new Set()
  const { data } = ctx.getImageData(0, 0, image.width, image.height)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    existingColors.add(`${r},${g},${b}`)
  }

  let r, g, b, key;
  do {
    r = Math.floor(Math.random() * 256)
    g = Math.floor(Math.random() * 256)
    b = Math.floor(Math.random() * 256)
    key = `${r},${g},${b}`
  } while (existingColors.has(key))

  return { r, g, b };
}

async function maybeStartGame(countdown = COUNTDOWN_SECONDS) {
  if (gameState) return;
  if (Object.keys(players).length < PLAYER_THRESH) return;
  console.log("Starting game...");

  const ttttttt = Date.now();
  let i = Math.floor(Math.random() * 5) + 1;

  const randImage = "/images/img" + i + ".jpg"
  console.log("Selected image: " + randImage);
  const targetColor = await generateTargetColor("public" + randImage)
  console.log(`Target color generated in ${Date.now() - ttttttt}ms: ${JSON.stringify(targetColor)}`);
  gameState = {
    imageUrl: randImage,
    targetColor,
    endTime: Date.now() + countdown * 1000 + GAME_DURATION,
  };
  io.to(Object.keys(players)).emit("game-start", { ...gameState, countdown });
  emitUpdate();
  setTimeout(endGame, GAME_DURATION + countdown * 1000);
}

function endGame() {
  console.log("Ending game...");
  io.to(Object.keys(players)).emit("game-end", {
    leaderboard: getLeaderboard()
  });
  gameState = null;
  Object.keys(players).forEach(id => {
    players[id].socket.disconnect();
    delete players[id];
  });
}

function emitUpdate() {
  if (!gameState) return;
  io.to(Object.keys(players)).emit("game-update", {
    ...gameState,
    leaderboard: getLeaderboard()
  });
}

function getLeaderboard() {
  return Object.values(players)
    .filter((player) => !!player.name)
    .map((player) => ({
      name: player.name,
      points: calculateScore(player.color, gameState.targetColor),
    }))
    .sort((a, b) => a.points - b.points);
}

function calculateScore(color1, color2) {
  if (!color1 || !color2) return 10000; // If either color is null, return a high score
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});