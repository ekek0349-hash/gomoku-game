
/* ==========================================
   HELLO KITTY GOMOKU
   AI + 난이도 + 전적 + 무르기 + 금수 규칙
   ========================================== */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const CELL = canvas.width / (SIZE + 1);
const PAD = CELL;

const directions = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

let board = [];
let history = [];
let currentPlayer = BLACK;
let gameOver = false;
let thinking = false;
let lastMove = null;
let aiTimer = null;

const $ = id => document.getElementById(id);

/* ==========================================
   전적 저장
   ========================================== */

function loadStats() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("kittyGomokuStats")
    );

    return {
      wins: Number(saved?.wins) || 0,
      losses: Number(saved?.losses) || 0,
      streak: Number(saved?.streak) || 0
    };
  } catch {
    return { wins: 0, losses: 0, streak: 0 };
  }
}

let stats = loadStats();

function saveStats() {
  localStorage.setItem(
    "kittyGomokuStats",
    JSON.stringify(stats)
  );
  updateStats();
}

function updateStats() {
  const total = stats.wins + stats.losses;

  $("wins").textContent = stats.wins;
  $("losses").textContent = stats.losses;
  $("streak").textContent = stats.streak;

  $("winRate").textContent = total
    ? Math.round(stats.wins / total * 100) + "%"
    : "0%";
}

/* ==========================================
   게임 초기화
   ========================================== */

function emptyBoard() {
  return Array.from(
    { length: SIZE },
    () => Array(SIZE).fill(EMPTY)
  );
}

function showMessage(text) {
  $("message").textContent = text;
}

function updateTurn() {
  if (gameOver) return;

  if (thinking) {
    $("turnLabel").textContent = "컴퓨터가 생각 중... 💭";
  } else {
    $("turnLabel").textContent =
      currentPlayer === BLACK
        ? "내 차례예요! 🎀"
        : "컴퓨터 차례예요";
  }

  $("undoBtn").disabled =
    thinking || history.length < 2 || gameOver;
}

function startGame() {
  if (aiTimer !== null) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  board = emptyBoard();
  history = [];

  currentPlayer = BLACK;
  gameOver = false;
  thinking = false;
  lastMove = null;

  showMessage("준비됐나요? 첫 수를 놓아보세요! 🎀");

  updateTurn();
  drawBoard();
}

/* ==========================================
   고양이 돌 디자인
   ========================================== */

function drawBow(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ff4f91";
  ctx.strokeStyle = "#d93476";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(-3, -3);
  ctx.lineTo(-17, -13);
  ctx.lineTo(-18, 3);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3, -3);
  ctx.lineTo(17, -13);
  ctx.lineTo(18, 3);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -3, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffb2cc";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawCat(x, y, side) {
  const r = CELL * 0.37;

  ctx.save();
  ctx.translate(x, y);

  const faceColor =
    side === BLACK ? "#fffdfd" : "#f5a0c1";

  const outlineColor =
    side === BLACK ? "#d7a7b8" : "#d66c97";

  // 그림자
  ctx.shadowColor = "#8c536455";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // 귀
  ctx.fillStyle = faceColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.5;

  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sign * r * 0.55, -r * 0.45);
    ctx.lineTo(sign * r * 0.9, -r * 1.15);
    ctx.lineTo(sign * r * 1.05, -r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 얼굴
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 눈
  ctx.fillStyle = "#45343b";

  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      sign * r * 0.36,
      -r * 0.05,
      2.2,
      3.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // 코
  ctx.fillStyle = "#e99a37";
  ctx.beginPath();
  ctx.ellipse(
    0,
    r * 0.18,
    2.7,
    2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 수염
  ctx.strokeStyle = "#92717d";
  ctx.lineWidth = 1;

  for (const sign of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(
        sign * r * 0.55,
        r * (0.16 + i * 0.2)
      );
      ctx.lineTo(
        sign * r * 1.05,
        r * (0.05 + i * 0.3)
      );
      ctx.stroke();
    }
  }

  // 리본
  if (side === BLACK) {
    drawBow(r * 0.58, -r * 0.72, 0.65);
  } else {
    drawBow(-r * 0.58, -r * 0.72, 0.65);
  }

  ctx.restore();
}

/* ==========================================
   오목판 그리기
   ========================================== */

function drawBoard() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 바탕
  ctx.fillStyle = "#f8d8b0";
  ctx.fillRect(0, 0, w, h);

  // 장식
  ctx.fillStyle = "#efb9c9";
  ctx.font = "18px Arial";
  ctx.fillText("♡", 12, 23);
  ctx.fillText("♡", w - 27, h - 10);

  // 격자
  ctx.strokeStyle = "#bd8a62";
  ctx.lineWidth = 1.3;

  for (let i = 0; i < SIZE; i++) {
    const p = PAD + i * CELL;

    ctx.beginPath();
    ctx.moveTo(PAD, p);
    ctx.lineTo(w - PAD, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, PAD);
    ctx.lineTo(p, h - PAD);
    ctx.stroke();
  }

  // 화점
  ctx.fillStyle = "#9c694b";

  [3, 7, 11].forEach(r => {
    [3, 7, 11].forEach(c => {
      ctx.beginPath();
      ctx.arc(
        PAD + c * CELL,
        PAD + r * CELL,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  });

  // 돌 그리기
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        drawCat(
          PAD + c * CELL,
          PAD + r * CELL,
          board[r][c]
        );
      }
    }
  }

  // 마지막 수 표시
  if (lastMove) {
    const x = PAD + lastMove.c * CELL;
    const y = PAD + lastMove.r * CELL;

    ctx.strokeStyle = "#ff3d87";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.47, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ==========================================
   기본 오목 판정
   ========================================== */

function countLine(r, c, dr, dc, side) {
  let count = 1;

  for (const sign of [-1, 1]) {
    let nr = r + dr * sign;
    let nc = c + dc * sign;

    while (
      nr >= 0 &&
      nr < SIZE &&
      nc >= 0 &&
      nc < SIZE &&
      board[nr][nc] === side
    ) {
      count++;
      nr += dr * sign;
      nc += dc * sign;
    }
  }

  return count;
}

function hasOverline(r, c) {
  return directions.some(([dr, dc]) =>
    countLine(r, c, dr, dc, BLACK) >= 6
  );
}

function hasExactFive(r, c) {
  return directions.some(([dr, dc]) =>
    countLine(r, c, dr, dc, BLACK) === 5
  );
}

function isWin(r, c, side) {
  for (const [dr, dc] of directions) {
    const count = countLine(r, c, dr, dc, side);

    if (side === BLACK && count === 5) {
      return true;
    }

    if (side === WHITE && count >= 5) {
      return true;
    }
  }

  return false;
}

/* ==========================================
   렌주 금수 판정 보조 함수
   ========================================== */

// 한 방향에서 5개의 연속된 칸이 모두 흑돌인지 확인
function isFiveWindow(r, c, dr, dc, start) {
  for (let i = 0; i < 5; i++) {
    const nr = r + dr * (start + i);
    const nc = c + dc * (start + i);

    if (
      nr < 0 ||
      nr >= SIZE ||
      nc < 0 ||
      nc >= SIZE ||
      board[nr][nc] !== BLACK
    ) {
      return false;
    }
  }

  return true;
}

// 한 방향의 4목 패턴을 서로 다른 형태로 수집
function getFourPatterns(r, c) {
  const patterns = new Set();

  for (const [dr, dc] of directions) {
    for (let k = -4; k <= 4; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;

      if (
        nr < 0 ||
        nr >= SIZE ||
        nc < 0 ||
        nc >= SIZE ||
        board[nr][nc] !== EMPTY
      ) {
        continue;
      }

      // 가상의 완성 수
      board[nr][nc] = BLACK;

      const overline = hasOverline(nr, nc);
      const exactFive = hasExactFive(nr, nc);

      if (!overline && exactFive) {
        // 실제 5목을 만드는 5칸 창 찾기
        for (const [dr2, dc2] of directions) {
          if (dr2 !== dr || dc2 !== dc) continue;

          for (let start = -4; start <= 0; start++) {
            if (!isFiveWindow(r, c, dr, dc, start)) {
              continue;
            }

            const stones = [];

            for (let i = 0; i < 5; i++) {
              const wr = r + dr * (start + i);
              const wc = c + dc * (start + i);

              if (board[wr][wc] === BLACK) {
                stones.push(wr + "," + wc);
              }
            }

            // 완성 지점을 제외한 4개의 흑돌
            const key = stones
              .filter(pos => pos !== nr + "," + nc)
              .sort()
              .join("|");

            if (key.split("|").length === 4) {
              patterns.add(key);
            }
          }
        }
      }

      board[nr][nc] = EMPTY;
    }
  }

  return patterns;
}

/* ==========================================
   열린 4 판정
   ========================================== */

function makesStraightOpenFour(
  r,
  c,
  dr,
  dc,
  extensionR,
  extensionC
) {
  for (let start = -5; start <= 0; start++) {
    const positions = [];

    let valid = true;

    for (let i = 0; i < 6; i++) {
      const nr = r + dr * (start + i);
      const nc = c + dc * (start + i);

      if (
        nr < 0 ||
        nr >= SIZE ||
        nc < 0 ||
        nc >= SIZE
      ) {
        valid = false;
        break;
      }

      positions.push([nr, nc]);
    }

    if (!valid) continue;

    // 양쪽 끝이 모두 비어 있어야 열린 4
    const first = positions[0];
    const last = positions[5];

    if (
      board[first[0]][first[1]] !== EMPTY ||
      board[last[0]][last[1]] !== EMPTY
    ) {
      continue;
    }

    // 가운데 네 칸이 모두 흑돌인지 확인
    let fourStones = true;

    for (let i = 1; i <= 4; i++) {
      const [nr, nc] = positions[i];

      if (board[nr][nc] !== BLACK) {
        fourStones = false;
        break;
      }
    }

    if (!fourStones) continue;

    // 기존 수와 확장 수가 해당 열린 4에 포함되는지 확인
    const includesOriginal = positions.some(
      ([nr, nc]) => nr === r && nc === c
    );

    const includesExtension = positions.some(
      ([nr, nc]) =>
        nr === extensionR && nc === extensionC
    );

    if (includesOriginal && includesExtension) {
      return true;
    }
  }

  return false;
}

/* ==========================================
   열린 3 판정
   ========================================== */

function countOpenThrees(r, c) {
  let total = 0;

  for (const [dr, dc] of directions) {
    let found = false;

    // 다음 수로 확장할 수 있는 빈칸 탐색
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;

      const nr = r + dr * k;
      const nc = c + dc * k;

      if (
        nr < 0 ||
        nr >= SIZE ||
        nc < 0 ||
        nc >= SIZE ||
        board[nr][nc] !== EMPTY
      ) {
        continue;
      }

      // 가상의 확장 수
      board[nr][nc] = BLACK;

      const overline = hasOverline(nr, nc);
      const exactFive = hasExactFive(nr, nc);

      let createsOpenFour = false;

      if (!overline && !exactFive) {
        // 확장 수가 44 금수라면 합법적인 열린 3 확장이 아님
        const fourCount = getFourPatterns(nr, nc).size;

        if (fourCount < 2) {
          createsOpenFour = makesStraightOpenFour(
            r,
            c,
            dr,
            dc,
            nr,
            nc
          );
        }
      }

      board[nr][nc] = EMPTY;

      if (createsOpenFour) {
        found = true;
        break;
      }
    }

    if (found) total++;
  }

  return total;
}

/* ==========================================
   최종 금수 판정
   ========================================== */

function forbidden(r, c) {
  if (board[r][c] !== EMPTY) {
    return "이미 돌이 놓여 있어요!";
  }

  board[r][c] = BLACK;

  // 장목 우선 검사
  if (hasOverline(r, c)) {
    board[r][c] = EMPTY;
    return "장목 금수입니다! 6개 이상 연결할 수 없어요.";
  }

  // 정확히 5목은 승리이므로 33·44보다 우선
  if (hasExactFive(r, c)) {
    board[r][c] = EMPTY;
    return null;
  }

  // 서로 다른 4목 형태가 2개 이상이면 44
  const fours = getFourPatterns(r, c).size;

  if (fours >= 2) {
    board[r][c] = EMPTY;
    return "44 금수입니다! 다른 곳에 놓아주세요.";
  }

  // 합법적으로 열린 4를 만들 수 있는 방향이 2개 이상이면 33
  const threes = countOpenThrees(r, c);

  board[r][c] = EMPTY;

  if (threes >= 2) {
    return "33 금수입니다! 다른 곳에 놓아주세요.";
  }

  return null;
}

/* ==========================================
   돌 놓기와 승리 처리
   ========================================== */

function place(r, c, side) {
  board[r][c] = side;

  history.push({
    r,
    c,
    side
  });

  lastMove = { r, c };

  drawBoard();
}

function finish(side) {
  gameOver = true;
  thinking = false;

  if (side === BLACK) {
    stats.wins++;
    stats.streak++;

    showMessage("축하해요! 내가 이겼어요! 🎀💗");
    $("turnLabel").textContent = "내가 이겼어요! 🎉";
  } else {
    stats.losses++;
    stats.streak = 0;

    showMessage("아쉽지만 다음에는 이길 수 있어요! 💕");
    $("turnLabel").textContent = "컴퓨터 승리!";
  }

  saveStats();
  updateTurn();
}

/* ==========================================
   AI 평가 함수
   ========================================== */

function evaluateAt(r, c, side) {
  let score = 0;

  for (const [dr, dc] of directions) {
    let count = 1;
    let open = 0;

    for (const sign of [-1, 1]) {
      let nr = r + dr * sign;
      let nc = c + dc * sign;

      while (
        nr >= 0 &&
        nr < SIZE &&
        nc >= 0 &&
        nc < SIZE &&
        board[nr][nc] === side
      ) {
        count++;

        nr += dr * sign;
        nc += dc * sign;
      }

      if (
        nr >= 0 &&
        nr < SIZE &&
        nc >= 0 &&
        nc < SIZE &&
        board[nr][nc] === EMPTY
      ) {
        open++;
      }
    }

    if (count >= 5) {
      score += 100000;
    } else if (count === 4 && open === 2) {
      score += 12000;
    } else if (count === 4 && open === 1) {
      score += 3000;
    } else if (count === 3 && open === 2) {
      score += 900;
    } else if (count === 3 && open === 1) {
      score += 150;
    } else if (count === 2 && open === 2) {
      score += 70;
    } else {
      score += count * 5;
    }
  }

  return score;
}

function getCandidates() {
  const found = new Set();

  if (history.length === 0) {
    return [{ r: 7, c: 7 }];
  }

  for (const move of history) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = move.r + dr;
        const c = move.c + dc;

        if (
          r >= 0 &&
          r < SIZE &&
          c >= 0 &&
          c < SIZE &&
          board[r][c] === EMPTY
        ) {
          found.add(r + "," + c);
        }
      }
    }
  }

  return [...found].map(value => {
    const [r, c] = value.split(",").map(Number);
    return { r, c };
  });
}

function chooseAI() {
  const level = $("difficulty").value;
  const moves = getCandidates();

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const { r, c } = move;

    // 공격 점수
    board[r][c] = WHITE;
    const attack = evaluateAt(r, c, WHITE);

    // 방어 점수
    board[r][c] = BLACK;
    const defense = evaluateAt(r, c, BLACK);

    board[r][c] = EMPTY;

    let score = attack + defense;

    const center =
      7 - Math.abs(7 - r) - Math.abs(7 - c);

    score += center * 2;

    if (level === "easy") {
      score = attack + Math.random() * 100;
    } else if (level === "normal") {
      score = attack * 1.05 + defense * 0.95;
    } else if (level === "hard") {
      score = attack * 1.2 + defense * 1.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/* ==========================================
   컴퓨터 차례
   ========================================== */

function computerTurn() {
  if (gameOver) return;

  thinking = true;
  currentPlayer = WHITE;

  updateTurn();
  showMessage("컴퓨터가 다음 수를 생각하고 있어요... 💭");

  aiTimer = setTimeout(() => {
    aiTimer = null;

    if (gameOver) return;

    const move = chooseAI();

    if (!move) {
      gameOver = true;
      showMessage("무승부예요! 다시 도전해 보세요.");
      updateTurn();
      return;
    }

    place(move.r, move.c, WHITE);

    if (isWin(move.r, move.c, WHITE)) {
      finish(WHITE);
      return;
    }

    if (history.length === SIZE * SIZE) {
      gameOver = true;
      thinking = false;

      showMessage("무승부예요! 다시 도전해 보세요.");
      updateTurn();
      return;
    }

    thinking = false;
    currentPlayer = BLACK;

    showMessage("내 차례예요! 어디에 놓을까요? 🎀");

    updateTurn();
    drawBoard();
  }, 350);
}

/* ==========================================
   사용자 클릭
   ========================================== */

function handleClick(event) {
  if (gameOver || thinking || currentPlayer !== BLACK) {
    return;
  }

  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const c = Math.round((x - PAD) / CELL);
  const r = Math.round((y - PAD) / CELL);

  if (
    r < 0 ||
    r >= SIZE ||
    c < 0 ||
    c >= SIZE
  ) {
    return;
  }

  if (board[r][c] !== EMPTY) {
    showMessage("이미 돌이 놓인 자리예요! 💗");
    return;
  }

  const ban = forbidden(r, c);

  if (ban) {
    showMessage(ban);
    return;
  }

  place(r, c, BLACK);

  if (isWin(r, c, BLACK)) {
    finish(BLACK);
    return;
  }

  if (history.length === SIZE * SIZE) {
    gameOver = true;
    showMessage("무승부예요!");
    updateTurn();
    return;
  }

  computerTurn();
}

/* ==========================================
   무르기
   ========================================== */

function undo() {
  if (
    thinking ||
    gameOver ||
    history.length < 2
  ) {
    return;
  }

  if (aiTimer !== null) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }

  // 사람과 컴퓨터의 수를 함께 취소
  for (let i = 0; i < 2; i++) {
    const last = history.pop();

    if (!last) break;

    board[last.r][last.c] = EMPTY;
  }

  currentPlayer = BLACK;
  thinking = false;
  lastMove = history.length
    ? history[history.length - 1]
    : null;

  showMessage("두 수를 되돌렸어요. 다시 생각해 보세요!");

  updateTurn();
  drawBoard();
}

/* ==========================================
   버튼 이벤트
   ========================================== */

canvas.addEventListener("click", handleClick);

$("newGameBtn").addEventListener(
  "click",
  startGame
);

$("undoBtn").addEventListener(
  "click",
  undo
);

$("resetStatsBtn").addEventListener("click", () => {
  if (!confirm("게임 기록을 모두 초기화할까요?")) {
    return;
  }

  stats = {
    wins: 0,
    losses: 0,
    streak: 0
  };

  saveStats();

  showMessage("기록을 초기화했어요. 다시 시작해 볼까요!");
});

/* ==========================================
   게임 실행
   ========================================== */

updateStats();
startGame();
