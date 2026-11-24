
"use strict";

const SIZE = 15;
const CELL = 38;
const PAD = 30;
const BOARD_SIZE = PAD * 2 + CELL * (SIZE - 1);

const $ = (id) => document.getElementById(id);
const canvas = $("board");
const ctx = canvas.getContext("2d");

let board = [];
let moves = [];
let currentPlayer = 1; // 1: 흑돌, 2: 백돌
let gameOver = false;
let thinking = false;
let aiTimer = null;
let lastMove = null;

let stats = loadData("kittyAiStats", {
  wins: 0, losses: 0, streak: 0
});

let localStats = loadData("kittyLocalStats", {
  player1: 0, player2: 0
});

function loadData(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved && typeof saved === "object" ? saved : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem("kittyAiStats", JSON.stringify(stats));
  localStorage.setItem("kittyLocalStats", JSON.stringify(localStats));
}

function isLocalMode() {
  return $("gameMode").value === "local";
}

function playerName(player) {
  if (player === 1) {
    return $("player1Name").value.trim() || "플레이어 1";
  }

  if (isLocalMode()) {
    return $("player2Name").value.trim() || "플레이어 2";
  }

  return "AI";
}

function initBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  moves = [];
  currentPlayer = 1;
  gameOver = false;
  thinking = false;
  lastMove = null;

  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  $("endModal").classList.add("hidden");
  updateTurn();
  drawBoard();
  updateStats();

  if (isLocalMode()) {
    showMessage(`${playerName(1)}님부터 시작하세요! 🎀`);
  } else {
    showMessage("흑돌부터 시작해 보세요! 💗");
  }
}

function showMessage(message) {
  $("message").textContent = message;
}

function updateTurn() {
  const local = isLocalMode();
  const name = playerName(currentPlayer);
  const stone = currentPlayer === 1 ? "흑돌" : "백돌";

  $("turnLabel").textContent = local
    ? `${name} 차례`
    : currentPlayer === 1 ? "내 차례" : "AI 생각 중";

  $("turnBadge").textContent =
    currentPlayer === 1 ? "🐱 흑돌" : "🤍 백돌";

  $("undoBtn").disabled = moves.length === 0 || gameOver || thinking;
  $("undoBtn").style.opacity = $("undoBtn").disabled ? ".45" : "1";
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 나무색 배경
  ctx.fillStyle = "#f4d9b1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 은은한 배경 무늬
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.fillRect(0, i * 42, canvas.width, 1);
  }

  // 바둑판 선
  ctx.strokeStyle = "#9b704e";
  ctx.lineWidth = 1.3;

  for (let i = 0; i < SIZE; i++) {
    const pos = PAD + i * CELL;

    ctx.beginPath();
    ctx.moveTo(PAD, pos);
    ctx.lineTo(PAD + (SIZE - 1) * CELL, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, PAD);
    ctx.lineTo(pos, PAD + (SIZE - 1) * CELL);
    ctx.stroke();
  }

  // 화점
  const stars = [3, 7, 11];
  ctx.fillStyle = "#8d6243";

  for (const r of stars) {
    for (const c of stars) {
      ctx.beginPath();
      ctx.arc(PAD + c * CELL, PAD + r * CELL, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 돌 그리기
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) {
        drawStone(r, c, board[r][c]);
      }
    }
  }

  // 마지막 돌 표시
  if (lastMove) {
    const x = PAD + lastMove.c * CELL;
    const y = PAD + lastMove.r * CELL;

    ctx.strokeStyle = "#e33f83";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
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
  ctx.fillStyle = "rgba(80,45,50,0.17)";
  ctx.fill();

  // 고양이 귀
  ctx.fillStyle = player === 1 ? "#59454f" : "#fffdfd";
  ctx.strokeStyle = player === 1 ? "#49333d" : "#e5a9c0";
  ctx.lineWidth = 1.4;

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
  ctx.ellipse(x - 5, y - 2, 1.6, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 5, y - 2, 1.6, 2.6, 0, 0, Math.PI * 2);
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

  // 리본
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

function canvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const c = Math.round((x - PAD) / CELL);
  const r = Math.round((y - PAD) / CELL);

  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;

  const targetX = PAD + c * CELL;
  const targetY = PAD + r * CELL;

  if (Math.hypot(x - targetX, y - targetY) > CELL * 0.48) {
    return null;
  }

  return { r, c };
}

canvas.addEventListener("click", (event) => {
  if (gameOver || thinking) return;

  if (!isLocalMode() && currentPlayer === 2) return;

  const point = canvasPosition(event);
  if (!point) return;

  placeStone(point.r, point.c);
});

function placeStone(r, c) {
  if (gameOver || board[r][c] !== 0) return false;

  // AI 대결 및 2인용 모두 흑돌의 금수 검사
  if (currentPlayer === 1 && isForbidden(r, c)) {
    showMessage("앗! 흑돌 금수 자리예요. 다른 곳에 놓아주세요! 🎀");
    return false;
  }

  board[r][c] = currentPlayer;
  moves.push({ r, c, player: currentPlayer });
  lastMove = { r, c };

  drawBoard();

  if (checkWin(r, c, currentPlayer)) {
    finish(currentPlayer);
    return true;
  }

  if (moves.length === SIZE * SIZE) {
    finish(0);
    return true;
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurn();

  if (isLocalMode()) {
    showMessage(`${playerName(currentPlayer)}님 차례입니다!`);
  } else if (currentPlayer === 2) {
    thinking = true;
    showMessage("AI가 다음 수를 생각하고 있어요... 🐾");
    updateTurn();

    aiTimer = setTimeout(() => {
      thinking = false;
      computerTurn();
    }, 450);
  } else {
    showMessage("좋아요! 다음 수를 놓아보세요 💗");
  }

  return true;
}

// --------------------------------------------------
// 승리 판정
// --------------------------------------------------

const directions = [
  [1, 0], [0, 1], [1, 1], [1, -1]
];

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
  for (const [dr, dc] of directions) {
    const count = countLine(r, c, dr, dc, player);

    if (player === 1 && count === 5) return true;
    if (player === 2 && count >= 5) return true;
  }

  return false;
}

// --------------------------------------------------
// 흑돌 금수 검사
// 33, 44, 장목을 기본 패턴으로 판별합니다.
// --------------------------------------------------

function isForbidden(r, c) {
  if (board[r][c] !== 0) return false;

  board[r][c] = 1;

  const lineCounts = directions.map(([dr, dc]) =>
    countLine(r, c, dr, dc, 1)
  );

  // 정확히 다섯 개를 만드는 수는 다른 금수보다 우선
  if (lineCounts.some(count => count === 5)) {
    board[r][c] = 0;
    return false;
  }

  // 장목
  if (lineCounts.some(count => count > 5)) {
    board[r][c] = 0;
    return true;
  }

  const fourCount = directions.filter(([dr, dc]) =>
    hasFour(r, c, dr, dc)
  ).length;

  const threeCount = directions.filter(([dr, dc]) =>
    hasOpenThree(r, c, dr, dc)
  ).length;

  board[r][c] = 0;

  return fourCount >= 2 || threeCount >= 2;
}

function hasFour(r, c, dr, dc) {
  // 놓은 돌을 포함하는 5칸 구간 중
  // 흑돌 4개와 빈칸 1개가 있는지 검사
  for (let start = -4; start <= 0; start++) {
    let black = 0;
    let empty = 0;
    let white = 0;
    let includesCenter = false;

    for (let k = 0; k < 5; k++) {
      const offset = start + k;
      const rr = r + dr * offset;
      const cc = c + dc * offset;

      if (offset === 0) includesCenter = true;

      if (
        rr < 0 || rr >= SIZE ||
        cc < 0 || cc >= SIZE
      ) {
        white++;
        continue;
      }

      if (board[rr][cc] === 1) black++;
      else if (board[rr][cc] === 0) empty++;
      else white++;
    }

    if (includesCenter && black === 4 && empty === 1 && white === 0) {
      return true;
    }
  }

  return false;
}

function hasOpenThree(r, c, dr, dc) {
  // 같은 방향에서 한 칸 더 놓았을 때
  // 양 끝이 열린 연속 4가 만들어지는지 확인
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
    const openFour = hasStraightOpenFour(r, c, dr, dc);
    board[rr][cc] = 0;

    if (openFour) return true;
  }

  return false;
}

function hasStraightOpenFour(r, c, dr, dc) {
  for (let start = -3; start <= 0; start++) {
    let allBlack = true;

    for (let k = 0; k < 4; k++) {
      const offset = start + k;
      const rr = r + dr * offset;
      const cc = c + dc * offset;

      if (
        rr < 0 || rr >= SIZE ||
        cc < 0 || cc >= SIZE ||
        board[rr][cc] !== 1
      ) {
        allBlack = false;
        break;
      }
    }

    if (!allBlack) continue;

    const beforeR = r + dr * (start - 1);
    const beforeC = c + dc * (start - 1);
    const afterR = r + dr * (start + 4);
    const afterC = c + dc * (start + 4);

    const beforeOpen =
      beforeR >= 0 && beforeR < SIZE &&
      beforeC >= 0 && beforeC < SIZE &&
      board[beforeR][beforeC] === 0;

    const afterOpen =
      afterR >= 0 && afterR < SIZE &&
      afterC >= 0 && afterC < SIZE &&
      board[afterR][afterC] === 0;

    if (beforeOpen && afterOpen) return true;
  }

  return false;
}

// --------------------------------------------------
// AI
// --------------------------------------------------

function computerTurn() {
  if (gameOver || isLocalMode()) return;

  const move = chooseAiMove();

  if (!move) {
    finish(0);
    return;
  }

  currentPlayer = 2;
  placeAiStone(move.r, move.c);
}

function placeAiStone(r, c) {
  board[r][c] = 2;
  moves.push({ r, c, player: 2 });
  lastMove = { r, c };

  drawBoard();

  if (checkWin(r, c, 2)) {
    finish(2);
    return;
  }

  if (moves.length === SIZE * SIZE) {
    finish(0);
    return;
  }

  currentPlayer = 1;
  updateTurn();
  showMessage("AI가 돌을 놓았어요! 이제 당신 차례예요 💗");
}

function chooseAiMove() {
  const candidates = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      if (!hasNearbyStone(r, c)) continue;

      candidates.push({
        r, c,
        score: evaluateMove(r, c)
      });
    }
  }

  if (candidates.length === 0) {
    return { r: 7, c: 7 };
  }

  candidates.sort((a, b) => b.score - a.score);

  const difficulty = $("difficulty").value;

  if (difficulty === "easy") {
    const top = candidates.slice(0, Math.min(8, candidates.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  if (difficulty === "normal") {
    const top = candidates.slice(0, Math.min(3, candidates.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  return candidates[0];
}

function hasNearbyStone(r, c) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue;

      const rr = r + dr;
      const cc = c + dc;

      if (
        rr >= 0 && rr < SIZE &&
        cc >= 0 && cc < SIZE &&
        board[rr][cc] !== 0
      ) {
        return true;
      }
    }
  }

  return moves.length === 0;
}

function evaluateMove(r, c) {
  let attack = 0;
  let defense = 0;

  board[r][c] = 2;
  for (const [dr, dc] of directions) {
    attack += lineScore(r, c, dr, dc, 2);
  }
  board[r][c] = 0;

  board[r][c] = 1;
  for (const [dr, dc] of directions) {
    defense += lineScore(r, c, dr, dc, 1);
  }
  board[r][c] = 0;

  const centerBonus = 14 - (
    Math.abs(7 - r) + Math.abs(7 - c)
  );

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

// --------------------------------------------------
// 경기 종료 및 기록
// --------------------------------------------------

function finish(winner) {
  gameOver = true;
  thinking = false;

  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  let resultText = "";

  if (winner === 0) {
    resultText = "무승부!";
    showMessage("무승부예요! 정말 팽팽한 승부였어요 🎀");
  } else if (isLocalMode()) {
    const winnerName = playerName(winner);
    resultText = `${winnerName} 승리! 🏆`;

    if (winner === 1) localStats.player1++;
    else localStats.player2++;

    showMessage(`${winnerName}님이 승리했습니다! 축하해요 💗`);
  } else if (winner === 1) {
    resultText = "플레이어 승리! 🏆";
    stats.wins++;
    stats.streak++;
    showMessage("축하해요! AI를 이겼어요! 🎉");
  } else {
    resultText = "AI 승리!";
    stats.losses++;
    stats.streak = 0;
    showMessage("아쉬워요! 다음 판에는 이길 수 있어요 💗");
  }

  saveData();
  updateStats();
  updateTurn();

  $("endResult").textContent = resultText;
  $("endModal").classList.remove("hidden");
}

function updateStats() {
  const total = stats.wins + stats.losses;
  const rate = total ? Math.round(stats.wins / total * 100) : 0;

  $("wins").textContent = stats.wins;
  $("losses").textContent = stats.losses;
  $("winRate").textContent = `${rate}%`;
  $("streak").textContent = stats.streak;

  $("localWins1").textContent = `${localStats.player1}승`;
  $("localWins2").textContent = `${localStats.player2}승`;

  $("localPlayer1Label").textContent = playerName(1);
  $("localPlayer2Label").textContent =
    $("player2Name").value.trim() || "플레이어 2";
}

// --------------------------------------------------
// 무르기
// --------------------------------------------------

function undo() {
  if (gameOver || thinking || moves.length === 0) return;

  const numberToUndo = isLocalMode() ? 1 : Math.min(2, moves.length);

  for (let i = 0; i < numberToUndo; i++) {
    const last = moves.pop();
    if (!last) break;

    board[last.r][last.c] = 0;
  }

  lastMove = moves.length
    ? { r: moves[moves.length - 1].r, c: moves[moves.length - 1].c }
    : null;

  currentPlayer = moves.length
    ? (moves[moves.length - 1].player === 1 ? 2 : 1)
    : 1;

  drawBoard();
  updateTurn();
  showMessage("수를 무르고 다시 시작합니다! 🎀");
}

// --------------------------------------------------
// 버튼 및 설정
// --------------------------------------------------

function startGame() {
  $("difficultySetting").style.display =
    isLocalMode() ? "none" : "flex";

  $("player2Setting").querySelector("label").textContent =
    isLocalMode()
      ? "플레이어 2 이름 (백돌)"
      : "상대방";

  $("player2Name").disabled = !isLocalMode();

  updateStats();
  initBoard();
}

$("newGameBtn").addEventListener("click", startGame);
$("modalNewGameBtn").addEventListener("click", startGame);
$("undoBtn").addEventListener("click", undo);

$("gameMode").addEventListener("change", startGame);
$("difficulty").addEventListener("change", () => {
  if (!isLocalMode()) {
    showMessage("난이도가 변경됐어요. 새 게임을 시작해 보세요!");
  }
});

$("player1Name").addEventListener("input", updateStats);
$("player2Name").addEventListener("input", updateStats);

$("resetStatsBtn").addEventListener("click", () => {
  if (!confirm("AI 대결 기록을 모두 초기화할까요?")) return;

  stats = { wins: 0, losses: 0, streak: 0 };
  saveData();
  updateStats();
});

$("resetLocalBtn").addEventListener("click", () => {
  if (!confirm("커스텀 매치 기록을 모두 초기화할까요?")) return;

  localStats = { player1: 0, player2: 0 };
  saveData();
  updateStats();
});

// 첫 게임 시작
startGame();
