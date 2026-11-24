
const SIZE = 15;
const BLACK = 1; // 사람
const WHITE = 2; // AI

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
let history = [];
let currentPlayer = BLACK;
let gameOver = false;
let aiThinking = false;
let lastMove = null;

const winsEl = document.getElementById("wins");
const lossesEl = document.getElementById("losses");
const rateEl = document.getElementById("winRate");
const streakEl = document.getElementById("streak");
const messageEl = document.getElementById("message");
const humanDot = document.getElementById("humanDot");
const aiDot = document.getElementById("aiDot");

const directions = [
  [1, 0], [0, 1], [1, 1], [1, -1]
];

function getStats() {
  try {
    return JSON.parse(localStorage.getItem("kittyGomokuStats")) ||
      { wins: 0, losses: 0, streak: 0 };
  } catch {
    return { wins: 0, losses: 0, streak: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem("kittyGomokuStats", JSON.stringify(stats));
  updateStats();
}

function updateStats() {
  const s = getStats();
  const total = s.wins + s.losses;
  winsEl.textContent = s.wins;
  lossesEl.textContent = s.losses;
  rateEl.textContent = total ? Math.round(s.wins / total * 100) + "%" : "0%";
  streakEl.textContent = s.streak;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function updateTurn() {
  humanDot.classList.toggle("active", currentPlayer === BLACK && !gameOver);
  aiDot.classList.toggle("active", currentPlayer === WHITE && !gameOver);
  document.getElementById("undoBtn").disabled =
    history.length === 0 || aiThinking;
}

function drawBoard() {
  const w = canvas.width;
  const pad = 42;
  const step = (w - pad * 2) / (SIZE - 1);

  ctx.clearRect(0, 0, w, w);

  const bg = ctx.createLinearGradient(0, 0, w, w);
  bg.addColorStop(0, "#ffe8d1");
  bg.addColorStop(1, "#ffd9c3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, w);

  // 은은한 장식
  ctx.fillStyle = "rgba(255,255,255,.28)";
  for (let i = 0; i < 20; i++) {
    const x = (i * 97 + 31) % w;
    const y = (i * 137 + 19) % w;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 바둑판 선
  ctx.strokeStyle = "#bd806d";
  ctx.lineWidth = 2;
  for (let i = 0; i < SIZE; i++) {
    const p = pad + i * step;
    ctx.beginPath();
    ctx.moveTo(pad, p);
    ctx.lineTo(w - pad, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, pad);
    ctx.lineTo(p, w - pad);
    ctx.stroke();
  }

  // 화점
  ctx.fillStyle = "#a86e61";
  [3, 7, 11].forEach(r => {
    [3, 7, 11].forEach(c => {
      ctx.beginPath();
      ctx.arc(pad + c * step, pad + r * step, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // 돌 그리기
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cells[r][c]) {
        drawCatStone(r, c, cells[r][c], pad, step);
      }
    }
  }

  // 마지막 수 표시
  if (lastMove) {
    const x = pad + lastMove.c * step;
    const y = pad + lastMove.r * step;
    ctx.strokeStyle = "#e04488";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 바깥쪽 작은 리본 장식
  drawTinyBow(18, 18, 0.65);
  drawTinyBow(w - 18, 18, 0.65);
  drawTinyBow(18, w - 18, 0.65);
  drawTinyBow(w - 18, w - 18, 0.65);
}

function drawTinyBow(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ed78a7";
  ctx.beginPath();
  ctx.ellipse(-8, 0, 9, 6, -0.5, 0, Math.PI * 2);
  ctx.ellipse(8, 0, 9, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c94e80";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCatStone(r, c, player, pad, step) {
  const x = pad + c * step;
  const y = pad + r * step;
  const radius = step * 0.39;

  ctx.save();

  // 그림자
  ctx.fillStyle = "rgba(120,70,80,.18)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 5, radius, radius * 0.83, 0, 0, Math.PI * 2);
  ctx.fill();

  // 귀
  ctx.fillStyle = player === BLACK ? "#fffdfd" : "#f7a4c5";
  ctx.strokeStyle = player === BLACK ? "#d7b8c2" : "#d96f9d";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - radius * .75, y - radius * .35);
  ctx.lineTo(x - radius * .72, y - radius * 1.1);
  ctx.lineTo(x - radius * .15, y - radius * .7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + radius * .75, y - radius * .35);
  ctx.lineTo(x + radius * .72, y - radius * 1.1);
  ctx.lineTo(x + radius * .15, y - radius * .7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 얼굴
  const face = ctx.createRadialGradient(
    x - radius * .3, y - radius * .4, 2,
    x, y, radius * 1.2
  );
  if (player === BLACK) {
    face.addColorStop(0, "#ffffff");
    face.addColorStop(1, "#f8eaf0");
  } else {
    face.addColorStop(0, "#ffd7e7");
    face.addColorStop(1, "#ef8db5");
  }

  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 눈
  ctx.fillStyle = "#59414b";
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.ellipse(x + side * radius * .34, y - radius * .04,
      radius * .075, radius * .12, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 코
  ctx.fillStyle = "#e98b9e";
  ctx.beginPath();
  ctx.arc(x, y + radius * .17, radius * .075, 0, Math.PI * 2);
  ctx.fill();

  // 수염
  ctx.strokeStyle = player === BLACK ? "#bda4ae" : "#c66e91";
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + side * radius * .48, y + radius * (.13 + i * .18));
      ctx.lineTo(x + side * radius * .9, y + radius * (.02 + i * .3));
      ctx.stroke();
    }
  }

  // 볼터치
  ctx.fillStyle = player === BLACK ? "rgba(255,150,180,.35)" : "rgba(255,255,255,.5)";
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.ellipse(x + side * radius * .55, y + radius * .35,
      radius * .14, radius * .08, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 사람 돌에는 리본, AI 돌에는 작은 하트 장식
  if (player === BLACK) {
    drawBowAt(x + radius * .52, y - radius * .65, radius * .55);
  } else {
    ctx.fillStyle = "#fff8fc";
    drawHeart(x + radius * .55, y - radius * .72, radius * .25);
  }

  ctx.restore();
}

function drawBowAt(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ed5c9b";
  ctx.strokeStyle = "#c9437d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-size * .48, 0, size * .55, size * .38, -.4, 0, Math.PI * 2);
  ctx.ellipse(size * .48, 0, size * .55, size * .38, .4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd5e5";
  ctx.beginPath();
  ctx.arc(0, 0, size * .19, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeart(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-18, -4, -10, -16, 0, -7);
  ctx.bezierCurveTo(10, -16, 18, -4, 0, 8);
  ctx.fill();
  ctx.restore();
}

function inside(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function countLine(r, c, dr, dc, player) {
  let count = 1;
  for (const sign of [-1, 1]) {
    let nr = r + dr * sign;
    let nc = c + dc * sign;
    while (inside(nr, nc) && cells[nr][nc] === player) {
      count++;
      nr += dr * sign;
      nc += dc * sign;
    }
  }
  return count;
}

function isOverline(r, c) {
  return directions.some(([dr, dc]) =>
    countLine(r, c, dr, dc, BLACK) >= 6
  );
}

function isExactFive(r, c, player) {
  return directions.some(([dr, dc]) =>
    countLine(r, c, dr, dc, player) === 5
  );
}

// 해당 방향에서 한 수로 다섯 개를 만들 수 있는지 확인
function hasFourThreat(r, c, dr, dc) {
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    const nr = r + dr * k;
    const nc = c + dc * k;
    if (!inside(nr, nc) || cells[nr][nc] !== 0) continue;

    cells[nr][nc] = BLACK;
    const wins = countLine(nr, nc, dr, dc, BLACK) === 5;
    cells[nr][nc] = 0;
    if (wins) return true;
  }
  return false;
}

// 다음 수로 열린 4를 만들 수 있는 3의 형태인지 간단 판정
function hasOpenThree(r, c, dr, dc) {
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    const nr = r + dr * k;
    const nc = c + dc * k;
    if (!inside(nr, nc) || cells[nr][nc] !== 0) continue;

    cells[nr][nc] = BLACK;

    let openFour = false;
    for (let j = -4; j <= 4; j++) {
      if (j === 0) continue;
      const er = nr + dr * j;
      const ec = nc + dc * j;
      if (!inside(er, ec) || cells[er][ec] !== 0) continue;

      cells[er][ec] = BLACK;
      const length = countLine(er, ec, dr, dc, BLACK);
      cells[er][ec] = 0;

      if (length === 5) {
        // 열린 양 끝이 있는 네 개의 연속 형태인지 검사
        let left = 0, right = 0;
        let rr = nr, cc = nc;
        while (inside(rr - dr, cc - dc) &&
               cells[rr - dr][cc - dc] === BLACK) {
          rr -= dr; cc -= dc;
        }
        if (inside(rr - dr, cc - dc) &&
            cells[rr - dr][cc - dc] === 0) left = 1;

        rr = nr; cc = nc;
        while (inside(rr + dr, cc + dc) &&
               cells[rr + dr][cc + dc] === BLACK) {
          rr += dr; cc += dc;
        }
        if (inside(rr + dr, cc + dc) &&
            cells[rr + dr][cc + dc] === 0) right = 1;

        if (left && right) openFour = true;
      }
      if (openFour) break;
    }

    cells[nr][nc] = 0;
    if (openFour) return true;
  }
  return false;
}

function forbiddenReason(r, c) {
  if (!inside(r, c) || cells[r][c] !== 0) return "이미 돌이 놓인 자리야.";

  cells[r][c] = BLACK;

  if (isOverline(r, c)) {
    cells[r][c] = 0;
    return "장목 금수야! 여섯 개 이상은 놓을 수 없어.";
  }

  // 정확히 다섯 개는 금수보다 우선
  if (isExactFive(r, c, BLACK)) {
    cells[r][c] = 0;
    return "";
  }

  let fours = 0;
  let threes = 0;

  for (const [dr, dc] of directions) {
    if (hasFourThreat(r, c, dr, dc)) fours++;
    if (hasOpenThree(r, c, dr, dc)) threes++;
  }

  cells[r][c] = 0;

  if (fours >= 2) return "44 금수야! 다른 자리를 골라줘.";
  if (threes >= 2) return "33 금수야! 다른 자리를 골라줘.";
  return "";
}

function placeStone(r, c, player) {
  cells[r][c] = player;
  history.push({ r, c, player });
  lastMove = { r, c };

  drawBoard();

  if (isExactFive(r, c, player) || (player === WHITE &&
      directions.some(([dr, dc]) => countLine(r, c, dr, dc, WHITE) >= 5))) {
    finishGame(player);
    return true;
  }
  return false;
}

function finishGame(winner) {
  gameOver = true;
  aiThinking = false;

  const stats = getStats();
  if (winner === BLACK) {
    stats.wins++;
    stats.streak++;
    setMessage("우와! 내가 이겼어! 축하해, 오목 천재냥! 🎀");
  } else {
    stats.losses++;
    stats.streak = 0;
    setMessage("AI가 이겼어! 다음 판에는 꼭 이겨보자 💗");
  }
  saveStats(stats);
  updateTurn();
}

function startNewGame() {
  for (let r = 0; r < SIZE; r++) cells[r].fill(0);
  history = [];
  currentPlayer = BLACK;
  gameOver = false;
  aiThinking = false;
  lastMove = null;
  setMessage("내 차례야! 원하는 곳에 돌을 놓아봐 💗");
  drawBoard();
  updateTurn();
}

function undoMove() {
  if (aiThinking || history.length === 0 || gameOver) return;

  // 사람과 AI가 둔 수를 함께 되돌리기
  let count = Math.min(2, history.length);
  while (count--) {
    const move = history.pop();
    cells[move.r][move.c] = 0;
  }

  currentPlayer = BLACK;
  lastMove = history.length
    ? { r: history[history.length - 1].r, c: history[history.length - 1].c }
    : null;

  setMessage("한 수 되돌렸어. 다시 생각해봐! 🌸");
  drawBoard();
  updateTurn();
}

function getCandidates() {
  const found = new Set();
  const candidates = [];

  if (history.length === 0) return [{ r: 7, c: 7 }];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cells[r][c] !== 0) continue;

      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (inside(r + dr, c + dc) && cells[r + dr][c + dc]) {
            near = true;
            break;
          }
        }
      }
      if (near) {
        const key = r + "," + c;
        if (!found.has(key)) {
          found.add(key);
          candidates.push({ r, c });
        }
      }
    }
  }
  return candidates;
}

function scorePoint(r, c, player) {
  cells[r][c] = player;
  let score = 0;

  for (const [dr, dc] of directions) {
    const length = countLine(r, c, dr, dc, player);
    const ends = countOpenEnds(r, c, dr, dc, player);

    if (length >= 5) score += 100000;
    else if (length === 4 && ends === 2) score += 12000;
    else if (length === 4) score += 3000;
    else if (length === 3 && ends === 2) score += 900;
    else if (length === 3) score += 250;
    else if (length === 2 && ends === 2) score += 80;
    else if (length === 2) score += 20;
  }

  cells[r][c] = 0;
  return score;
}

function countOpenEnds(r, c, dr, dc, player) {
  let open = 0;

  for (const sign of [-1, 1]) {
    let nr = r, nc = c;
    while (inside(nr + dr * sign, nc + dc * sign) &&
           cells[nr + dr * sign][nc + dc * sign] === player) {
      nr += dr * sign;
      nc += dc * sign;
    }
    const er = nr + dr * sign;
    const ec = nc + dc * sign;
    if (inside(er, ec) && cells[er][ec] === 0) open++;
  }
  return open;
}

function chooseAIMove() {
  const level = document.getElementById("difficulty").value;
  const candidates = getCandidates();
  let best = [];
  let bestScore = -Infinity;

  for (const move of candidates) {
    const attack = scorePoint(move.r, move.c, WHITE);
    const defense = scorePoint(move.r, move.c, BLACK);
    let score = attack + defense * 0.92;

    if (level === "easy") score += Math.random() * 500;
    if (level === "normal") score += Math.random() * 100;
    if (level === "hard") {
      score += attack * 0.15 + defense * 0.15;
    }

    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }

  return best[Math.floor(Math.random() * best.length)] || { r: 7, c: 7 };
}

function aiTurn() {
  if (gameOver) return;

  aiThinking = true;
  setMessage("AI 고양이가 생각 중이야... 🐾");
  updateTurn();

  setTimeout(() => {
    if (gameOver) return;

    const move = chooseAIMove();
    if (move) {
      const won = placeStone(move.r, move.c, WHITE);
      if (!won) {
        currentPlayer = BLACK;
        setMessage("내 차례야! 좋은 자리를 찾아봐 💗");
      }
    }

    aiThinking = false;
    updateTurn();
  }, 350);
}

function handleBoardClick(event) {
  if (gameOver || aiThinking || currentPlayer !== BLACK) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const pad = 42;
  const step = (canvas.width - pad * 2) / (SIZE - 1);
  const c = Math.round((x - pad) / step);
  const r = Math.round((y - pad) / step);

  if (!inside(r, c)) return;

  const reason = forbiddenReason(r, c);
  if (reason) {
    setMessage(reason);
    return;
  }

  const won = placeStone(r, c, BLACK);
  if (won) return;

  currentPlayer = WHITE;
  updateTurn();
  aiTurn();
}

canvas.addEventListener("click", handleBoardClick);

document.getElementById("restartBtn").addEventListener("click", startNewGame);
document.getElementById("undoBtn").addEventListener("click", undoMove);

document.getElementById("resetStatsBtn").addEventListener("click", () => {
  if (confirm("저장된 승패 기록을 모두 초기화할까?")) {
    saveStats({ wins: 0, losses: 0, streak: 0 });
  }
});

updateStats();
startNewGame();

