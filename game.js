
"use strict";

/* 기본 설정 */
const SIZE = 15;
const PAD = 30;
const CELL = 38;
const CENTER = 7;

const $ = (id) => document.getElementById(id);
const canvas = $("board");
const ctx = canvas.getContext("2d");

const DIRECTIONS = [
  [1, 0], [0, 1], [1, 1], [1, -1]
];

let board = [];
let moves = [];
let currentPlayer = 1;
let gameOver = false;
let thinking = false;
let aiTimer = null;
let lastMove = null;

/* 기록 불러오기 */
function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

let aiStats = readStorage("kittyAiStats", {
  wins: 0, losses: 0, streak: 0
});

let localStats = readStorage("kittyLocalStats", {
  player1: 0, player2: 0
});

function saveStats() {
  localStorage.setItem("kittyAiStats", JSON.stringify(aiStats));
  localStorage.setItem("kittyLocalStats", JSON.stringify(localStats));
}

function isLocalMode() {
  return $("gameMode").value === "local";
}

function getPlayerName(player) {
  if (player === 1) {
    return $("player1Name").value.trim() || "플레이어 1";
  }

  if (isLocalMode()) {
    return $("player2Name").value.trim() || "플레이어 2";
  }

  return "AI";
}

/* 게임 초기화 */
function startGame() {
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  moves = [];
  currentPlayer = 1;
  gameOver = false;
  thinking = false;
  lastMove = null;

  $("endModal").classList.add("hidden");
  $("endModal").style.display = "none";

  $("difficultyBox").style.display = isLocalMode() ? "none" : "flex";
  $("player2Box").querySelector("label").textContent =
    isLocalMode() ? "플레이어 2 이름 (백돌)" : "상대방 (AI)";

  $("player2Name").disabled = !isLocalMode();

  updateStats();
  updateTurn();
  drawBoard();

  if (isLocalMode()) {
    showMessage(`${getPlayerName(1)}님부터 시작하세요! 🎀`);
  } else {
    showMessage("흑돌부터 시작해 보세요! 💗");
  }
}

function showMessage(message) {
  $("message").textContent = message;
}

function updateTurn() {
  const name = getPlayerName(currentPlayer);

  if (isLocalMode()) {
    $("turnLabel").textContent = `${name} 차례`;
  } else {
    $("turnLabel").textContent =
      currentPlayer === 1 ? "내 차례" : "AI 생각 중";
  }

  $("turnBadge").textContent =
    currentPlayer === 1 ? "🐱 흑돌" : "🤍 백돌";

  $("undoBtn").disabled =
    moves.length === 0 || gameOver || thinking;
}

/* 오목판 그리기 */
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f4d9b1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 은은한 나무 무늬
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, i * 31);
    ctx.lineTo(600, i * 31);
    ctx.stroke();
  }

  // 바둑판 선
  ctx.strokeStyle = "#9b704e";
  ctx.lineWidth = 1.3;

  for (let i = 0; i < SIZE; i++) {
    const p = PAD + i * CELL;

    ctx.beginPath();
    ctx.moveTo(PAD, p);
    ctx.lineTo(PAD + (SIZE - 1) * CELL, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, PAD);
    ctx.lineTo(p, PAD + (SIZE - 1) * CELL);
    ctx.stroke();
  }

  // 화점
  ctx.fillStyle = "#8d6243";

  [3, 7, 11].forEach(r => {
    [3, 7, 11].forEach(c => {
      ctx.beginPath();
      ctx.arc(PAD + c * CELL, PAD + r * CELL, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // 돌
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) {
        drawStone(r, c, board[r][c]);
      }
    }
  }

  // 마지막 돌 표시
  if (lastMove) {
    ctx.beginPath();
    ctx.arc(
      PAD + lastMove.c * CELL,
      PAD + lastMove.r * CELL,
      17, 0, Math.PI * 2
    );
    ctx.strokeStyle = "#e33f83";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawStone(r, c, player) {
  const x = PAD + c * CELL;
  const y = PAD + r * CELL;

  ctx.save();

  // 그림자
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 4, 14, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(80,45,50,0.18)";
  ctx.fill();

  // 고양이 귀
  ctx.fillStyle = player === 1 ? "#59454f" : "#fffdfd";
  ctx.strokeStyle = player === 1 ? "#49333d" : "#e5a9c0";
  ctx.lineWidth = 1.3;

  ctx.beginPath();
  ctx.moveTo(x - 10, y - 7);
  ctx.lineTo(x - 12, y - 18);
  ctx.lineTo(x - 2, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 10, y - 7);
  ctx.lineTo(x + 12, y - 18);
  ctx.lineTo(x + 2, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 얼굴
  const gradient = ctx.createRadialGradient(
    x - 5, y - 7, 2, x, y, 16
  );

  if (player === 1) {
    gradient.addColorStop(0, "#89717d");
    gradient.addColorStop(1, "#44333d");
  } else {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#f8dce8");
  }

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = player === 1 ? "#44333d" : "#e8b1c8";
  ctx.stroke();

  // 눈
  ctx.fillStyle = player === 1 ? "#ffffff" : "#57414a";

  ctx.beginPath();
  ctx.ellipse(x - 5, y - 2, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 5, y - 2, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 코
  ctx.fillStyle = "#ed80a9";
  ctx.beginPath();
  ctx.arc(x, y + 2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 수염
  ctx.strokeStyle = player === 1 ? "#e9d9df" : "#bd8a9e";
  ctx.lineWidth = 0.7;

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 7, y + 3);
    ctx.lineTo(x + side * 12, y + 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + side * 7, y + 5);
    ctx.lineTo(x + side * 12, y + 7);
    ctx.stroke();
  }

  // 백돌의 핑크 리본
  if (player === 2) {
    ctx.fillStyle = "#ed6b9d";

    ctx.beginPath();
    ctx.moveTo(x + 7, y - 13);
    ctx.lineTo(x + 1, y - 19);
    ctx.lineTo(x + 10, y - 20);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 7, y - 13);
    ctx.lineTo(x + 13, y - 19);
    ctx.lineTo(x + 16, y - 11);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 8, y - 14, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb5d0";
    ctx.fill();
  }

  ctx.restore();
}

/* 클릭 위치 계산 */
function getBoardPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;

  const c = Math.round((x - PAD) / CELL);
  const r = Math.round((y - PAD) / CELL);

  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
    return null;
  }

  const targetX = PAD + c * CELL;
  const targetY = PAD + r * CELL;

  if (Math.hypot(x - targetX, y - targetY) > CELL * 0.48) {
    return null;
  }

  return { r, c };
}

/* 사람의 클릭 */
canvas.addEventListener("click", (event) => {
  if (gameOver || thinking) return;

  // AI 모드에서는 흑돌 차례에만 클릭 허용
  if (!isLocalMode() && currentPlayer !== 1) return;

  const point = getBoardPosition(event);
  if (!point) return;

  playMove(point.r, point.c);
});

/* 착수 처리 */
function playMove(r, c) {
  if (gameOver || thinking || board[r][c] !== 0) return false;

  const localMode = isLocalMode();
  const player = currentPlayer;

  // 금수는 AI 모드의 흑돌에만 적용
  if (!localMode && player === 1 && isForbidden(r, c)) {
    showMessage("금수 자리예요! 다른 곳에 놓아주세요 🎀");
    return false;
  }

  board[r][c] = player;
  moves.push({ r, c, player });
  lastMove = { r, c };

  drawBoard();

  if (checkWin(r, c, player)) {
    finish(player);
    return true;
  }

  if (moves.length >= SIZE * SIZE) {
    finish(0);
    return true;
  }

  // 커스텀 매치: 사람끼리 교대로 진행
  if (localMode) {
    currentPlayer = player === 1 ? 2 : 1;
    updateTurn();
    showMessage(`${getPlayerName(currentPlayer)}님 차례입니다! 🎀`);
    return true;
  }

  // AI 모드: 흑돌 다음에 AI가 백돌을 둠
  currentPlayer = 2;
  thinking = true;
  updateTurn();
  showMessage("AI가 생각하고 있어요... 🐾");

  aiTimer = setTimeout(() => {
    if (gameOver || isLocalMode()) return;

    thinking = false;
    computerTurn();
  }, 450);

  return true;
}

/* 승리 판정 */
function countLine(r, c, dr, dc, player) {
  let count = 1;

  for (const sign of [-1, 1]) {
    let nr = r + dr * sign;
    let nc = c + dc * sign;

    while (
      nr >= 0 && nr < SIZE &&
      nc >= 0 && nc < SIZE &&
      board[nr][nc] === player
    ) {
      count++;
      nr += dr * sign;
      nc += dc * sign;
    }
  }

  return count;
}

function checkWin(r, c, player) {
  for (const [dr, dc] of DIRECTIONS) {
    const count = countLine(r, c, dr, dc, player);

    if (player === 1 && count === 5) return true;
    if (player === 2 && count >= 5) return true;
  }

  return false;
}

/* 간이 흑돌 금수 판정 */
function isForbidden(r, c) {
  board[r][c] = 1;

  const counts = DIRECTIONS.map(([dr, dc]) =>
    countLine(r, c, dr, dc, 1)
  );

  // 정확히 다섯 개를 만드는 수는 허용
  if (counts.some(n => n === 5)) {
    board[r][c] = 0;
    return false;
  }

  // 장목
  if (counts.some(n => n > 5)) {
    board[r][c] = 0;
    return true;
  }

  const fours = DIRECTIONS.filter(([dr, dc]) =>
    hasFour(r, c, dr, dc)
  ).length;

  const threes = DIRECTIONS.filter(([dr, dc]) =>
    hasOpenThree(r, c, dr, dc)
  ).length;

  board[r][c] = 0;

  return fours >= 2 || threes >= 2;
}

function hasFour(r, c, dr, dc) {
  for (let start = -4; start <= 0; start++) {
    let black = 0;
    let empty = 0;
    let blocked = false;

    for (let k = 0; k < 5; k++) {
      const offset = start + k;
      const rr = r + dr * offset;
      const cc = c + dc * offset;

      if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) {
        blocked = true;
        break;
      }

      if (board[rr][cc] === 1) black++;
      else if (board[rr][cc] === 0) empty++;
      else blocked = true;
    }

    if (!blocked && black === 4 && empty === 1) return true;
  }

  return false;
}

function hasOpenThree(r, c, dr, dc) {
  for (let offset = -4; offset <= 4; offset++) {
    if (offset === 0) continue;

    const rr = r + dr * offset;
    const cc = c + dc * offset;

    if (
      rr < 0 || rr >= SIZE ||
      cc < 0 || cc >= SIZE ||
      board[rr][cc] !== 0
    ) continue;

    board[rr][cc] = 1;
    const found = hasStraightOpenFour(r, c, dr, dc);
    board[rr][cc] = 0;

    if (found) return true;
  }

  return false;
}

function hasStraightOpenFour(r, c, dr, dc) {
  for (let start = -3; start <= 0; start++) {
    let valid = true;

    for (let k = 0; k < 4; k++) {
      const offset = start + k;
      const rr = r + dr * offset;
      const cc = c + dc * offset;

      if (
        rr < 0 || rr >= SIZE ||
        cc < 0 || cc >= SIZE ||
        board[rr][cc] !== 1
      ) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    const br = r + dr * (start - 1);
    const bc = c + dc * (start - 1);
    const ar = r + dr * (start + 4);
    const ac = c + dc * (start + 4);

    const before = br >= 0 && br < SIZE && bc >= 0 && bc < SIZE &&
      board[br][bc] === 0;

    const after = ar >= 0 && ar < SIZE && ac >= 0 && ac < SIZE &&
      board[ar][ac] === 0;

    if (before && after) return true;
  }

  return false;
}

/* AI */
function computerTurn() {
  if (gameOver || isLocalMode()) return;

  const move = chooseAiMove();

  if (!move) {
    finish(0);
    return;
  }

  board[move.r][move.c] = 2;
  moves.push({ r: move.r, c: move.c, player: 2 });
  lastMove = { r: move.r, c: move.c };

  drawBoard();

  if (checkWin(move.r, move.c, 2)) {
    finish(2);
    return;
  }

  if (moves.length >= SIZE * SIZE) {
    finish(0);
    return;
  }

  currentPlayer = 1;
  thinking = false;
  updateTurn();
  showMessage("AI가 돌을 놓았어요! 이제 당신 차례예요 💗");
}

function hasNearbyStone(r, c) {
  if (moves.length === 0) return true;

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const rr = r + dr;
      const cc = c + dc;

      if (
        rr >= 0 && rr < SIZE &&
        cc >= 0 && cc < SIZE &&
        board[rr][cc] !== 0
      ) return true;
    }
  }

  return false;
}

function chooseAiMove() {
  const candidates = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0 || !hasNearbyStone(r, c)) continue;

      candidates.push({
        r, c,
        score: evaluateMove(r, c)
      });
    }
  }

  if (!candidates.length) return { r: CENTER, c: CENTER };

  candidates.sort((a, b) => b.score - a.score);

  const difficulty = $("difficulty").value;

  if (difficulty === "easy") {
    const choices = candidates.slice(0, Math.min(8, candidates.length));
    return choices[Math.floor(Math.random() * choices.length)];
  }

  if (difficulty === "normal") {
    const choices = candidates.slice(0, Math.min(3, candidates.length));
    return choices[Math.floor(Math.random() * choices.length)];
  }

  return candidates[0];
}

function evaluateMove(r, c) {
  let attack = 0;
  let defense = 0;

  board[r][c] = 2;
  for (const [dr, dc] of DIRECTIONS) {
    attack += lineScore(r, c, dr, dc, 2);
  }
  board[r][c] = 0;

  board[r][c] = 1;
  for (const [dr, dc] of DIRECTIONS) {
    defense += lineScore(r, c, dr, dc, 1);
  }
  board[r][c] = 0;

  const centerBonus = 14 - Math.abs(7 - r) - Math.abs(7 - c);
  return Math.max(attack, defense * 0.95) + centerBonus;
}

function lineScore(r, c, dr, dc, player) {
  let count = 1;
  let openEnds = 0;

  for (const sign of [-1, 1]) {
    let nr = r + dr * sign;
    let nc = c + dc * sign;

    while (
      nr >= 0 && nr < SIZE &&
      nc >= 0 && nc < SIZE &&
      board[nr][nc] === player
    ) {
      count++;
      nr += dr * sign;
      nc += dc * sign;
    }

    if (
      nr >= 0 && nr < SIZE &&
      nc >= 0 && nc < SIZE &&
      board[nr][nc] === 0
    ) {
      openEnds++;
    }
  }

  if (count >= 5) return 100000;
  if (count === 4 && openEnds === 2) return 15000;
  if (count === 4 && openEnds === 1) return 5000;
  if (count === 3 && openEnds === 2) return 1200;
  if (count === 3 && openEnds === 1) return 250;
  if (count === 2 && openEnds === 2) return 100;
  if (count === 2 && openEnds === 1) return 30;

  return count * 5;
}

/* 경기 종료 */
function finish(winner) {
  if (gameOver) return;

  gameOver = true;
  thinking = false;

  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  let result = "";

  if (winner === 0) {
    result = "무승부!";
  } else if (isLocalMode()) {
    result = `${getPlayerName(winner)} 승리! 🏆`;

    if (winner === 1) localStats.player1++;
    else localStats.player2++;
  } else if (winner === 1) {
    result = "플레이어 승리! 🏆";
    aiStats.wins++;
    aiStats.streak++;
  } else {
    result = "AI 승리!";
    aiStats.losses++;
    aiStats.streak = 0;
  }

  saveStats();
  updateStats();
  updateTurn();

  showMessage("경기가 끝났습니다! 춘천신협 사랑해요 💗");

  // 팝업 표시
  $("endResult").textContent = result;

  const modal = $("endModal");
  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

function updateStats() {
  const total = aiStats.wins + aiStats.losses;
  const rate = total === 0 ? 0 : Math.round(aiStats.wins / total * 100);

  $("wins").textContent = aiStats.wins;
  $("losses").textContent = aiStats.losses;
  $("winRate").textContent = `${rate}%`;
  $("streak").textContent = aiStats.streak;

  $("localWins1").textContent = `${localStats.player1}승`;
  $("localWins2").textContent = `${localStats.player2}승`;

  $("localPlayer1Label").textContent =
    $("player1Name").value.trim() || "플레이어 1";

  $("localPlayer2Label").textContent =
    $("player2Name").value.trim() || "플레이어 2";
}

/* 무르기 */
function undoMove() {
  if (gameOver || thinking || moves.length === 0) return;

  const count = isLocalMode() ? 1 : Math.min(2, moves.length);

  for (let i = 0; i < count; i++) {
    const move = moves.pop();
    if (!move) break;
    board[move.r][move.c] = 0;
  }

  lastMove = moves.length
    ? { r: moves[moves.length - 1].r, c: moves[moves.length - 1].c }
    : null;

  currentPlayer = moves.length
    ? (moves[moves.length - 1].player === 1 ? 2 : 1)
    : 1;

  drawBoard();
  updateTurn();
  showMessage("마지막 수를 무르고 다시 시작합니다! 🎀");
}

/* 버튼 연결 */
$("newGameBtn").addEventListener("click", startGame);
$("modalNewGameBtn").addEventListener("click", startGame);
$("undoBtn").addEventListener("click", undoMove);

$("gameMode").addEventListener("change", startGame);

$("difficulty").addEventListener("change", () => {
  if (!isLocalMode()) {
    showMessage("난이도가 변경됐어요. 새 게임을 시작해 보세요!");
  }
});

$("player1Name").addEventListener("input", updateStats);
$("player2Name").addEventListener("input", updateStats);

$("resetStatsBtn").addEventListener("click", () => {
  if (!confirm("AI 대결 기록을 초기화할까요?")) return;

  aiStats = { wins: 0, losses: 0, streak: 0 };
  saveStats();
  updateStats();
});

$("resetLocalBtn").addEventListener("click", () => {
  if (!confirm("2인용 기록을 초기화할까요?")) return;

  localStats = { player1: 0, player2: 0 };
  saveStats();
  updateStats();
});

/* 게임 시작 */
startGame();
