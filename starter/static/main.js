// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const LEADERBOARD_KEY = 'sudokuLeaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;
const DIFFICULTIES = {
  Easy: 45,
  Medium: 35,
  Hard: 27
};
let puzzle = [];
let hintsUsed = 0;
let currentDifficulty = 'Medium';
let gameStartedAt = null;
let gameCompleted = false;
let timerInterval = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function elapsedSeconds() {
  if (gameStartedAt === null) return 0;
  return Math.floor((Date.now() - gameStartedAt) / 1000);
}

function updateTimer() {
  document.getElementById('elapsed-time').innerText = formatTime(elapsedSeconds());
}

function readLeaderboard() {
  const storedScores = localStorage.getItem(LEADERBOARD_KEY);
  if (storedScores === null) return [];

  const scores = JSON.parse(storedScores);
  if (!Array.isArray(scores) || scores.some((score) => (
    !score ||
    typeof score.name !== 'string' ||
    !Number.isInteger(score.time) ||
    typeof score.difficulty !== 'string' ||
    !Number.isInteger(score.hints)
  ))) {
    throw new Error('Saved leaderboard data is invalid.');
  }
  return scores;
}

function renderLeaderboard() {
  const tableBody = document.getElementById('leaderboard-scores');
  tableBody.innerHTML = '';
  const scores = readLeaderboard()
    .sort((first, second) => first.time - second.time)
    .slice(0, MAX_LEADERBOARD_ENTRIES);

  for (const [index, score] of scores.entries()) {
    const row = document.createElement('tr');
    for (const value of [
      index + 1,
      score.name,
      formatTime(score.time),
      score.difficulty,
      score.hints
    ]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  }
}

function saveScore(name) {
  const scores = readLeaderboard();
  scores.push({
    name: name.trim(),
    time: elapsedSeconds(),
    difficulty: currentDifficulty,
    hints: hintsUsed
  });
  scores.sort((first, second) => first.time - second.time);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores.slice(0, MAX_LEADERBOARD_ENTRIES)));
  renderLeaderboard();
}

function showLeaderboardError(error) {
  const message = document.getElementById('leaderboard-message');
  message.innerText = `Unable to update leaderboard: ${error.message}`;
}

/**
 * Find every filled cell that repeats a digit in its row, column or 3x3 box.
 * Pure function so it can be unit-tested without a browser.
 * @param {number[][]} board 9x9 grid, 0 = empty.
 * @returns {Set<number>} flat indexes (row * 9 + col) of conflicting cells.
 */
function findConflicts(board) {
  const conflicts = new Set();
  const groups = [];
  for (let i = 0; i < SIZE; i++) {
    const row = [];
    const col = [];
    for (let j = 0; j < SIZE; j++) {
      row.push([i, j]);
      col.push([j, i]);
    }
    groups.push(row, col);
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
      const box = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) box.push([boxRow + i, boxCol + j]);
      }
      groups.push(box);
    }
  }
  for (const group of groups) {
    const seen = new Map();
    for (const [r, c] of group) {
      const value = board[r][c];
      if (!value) continue;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(r * SIZE + c);
    }
    for (const indexes of seen.values()) {
      if (indexes.length > 1) indexes.forEach((index) => conflicts.add(index));
    }
  }
  return conflicts;
}

function getInputs() {
  return document.getElementById('sudoku-board').getElementsByTagName('input');
}

/** Re-apply the .conflict class to every cell that breaks a Sudoku rule. */
function updateConflicts() {
  const inputs = getInputs();
  const conflicts = findConflicts(readBoard(inputs));
  for (let idx = 0; idx < inputs.length; idx++) {
    const isConflict = conflicts.has(idx);
    inputs[idx].classList.toggle('conflict', isConflict);
    if (isConflict) {
      inputs[idx].setAttribute('aria-invalid', 'true');
    } else {
      inputs[idx].removeAttribute('aria-invalid');
    }
  }
  return conflicts;
}

/** When the board is full and conflict-free, run the normal solution check. */
function checkIfComplete() {
  if (gameCompleted) return;
  const inputs = getInputs();
  const board = readBoard(inputs);
  const isFull = board.every((row) => row.every((value) => value !== 0));
  if (isFull && updateConflicts().size === 0) checkSolution();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  const isDark = theme === 'dark';
  toggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  toggle.setAttribute('aria-pressed', String(isDark));
}

function initTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem('sudokuTheme');
  } catch (error) { /* storage unavailable */ }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(theme);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('sudokuTheme', next);
  } catch (error) { /* ignore: theme just will not persist */ }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        e.target.classList.remove('incorrect');
        updateConflicts();
        checkIfComplete();
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  hintsUsed = 0;
  gameCompleted = false;
  gameStartedAt = Date.now();
  if (timerInterval !== null) window.clearInterval(timerInterval);
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
  document.getElementById('hint-count').innerText = 'Hints used: 0';
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  currentDifficulty = document.getElementById('difficulty').value;
  const clues = DIFFICULTIES[currentDifficulty];
  const res = await fetch(`/new?clues=${clues}`);
  const data = await res.json();
  if (!res.ok) {
    document.getElementById('message').innerText = data.error || 'Unable to start a game.';
    return;
  }
  renderPuzzle(data.puzzle);
  document.getElementById('message').innerText = '';
}

function readBoard(inputs) {
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const value = inputs[i * SIZE + j].value;
      board[i][j] = value ? parseInt(value, 10) : 0;
    }
  }
  return board;
}

async function getHint() {
  const inputs = document.getElementById('sudoku-board').getElementsByTagName('input');
  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board: readBoard(inputs)})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (!res.ok) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error || 'Unable to provide a hint.';
    return;
  }
  const input = inputs[data.row * SIZE + data.col];
  input.value = data.value;
  input.disabled = true;
  input.classList.remove('incorrect', 'conflict');
  input.classList.add('prefilled', 'hint');
  hintsUsed += 1;
  document.getElementById('hint-count').innerText = `Hints used: ${hintsUsed}`;
  msg.innerText = '';
  updateConflicts();
  checkIfComplete();
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = readBoard(inputs);
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const hasEmptyCells = board.some((row) => row.includes(0));
  // The server also lists empty cells; only filled-in wrong digits count as mistakes.
  const wrongEntries = new Set(
    data.incorrect
      .filter(([row, col]) => board[row][col] !== 0)
      .map(([row, col]) => row * SIZE + col)
  );
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.classList.toggle('incorrect', wrongEntries.has(idx));
  }
  if (wrongEntries.size > 0) {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  } else if (hasEmptyCells) {
    msg.style.color = '#388e3c';
    msg.innerText = 'No mistakes so far, keep going!';
  } else {
    msg.style.color = '#388e3c';
    if (!gameCompleted) {
      gameCompleted = true;
      window.clearInterval(timerInterval);
      updateTimer();
      const finishTime = formatTime(elapsedSeconds());
      const hintWord = hintsUsed === 1 ? 'hint' : 'hints';
      msg.innerText = `Congratulations! You solved it in ${finishTime} with ${hintsUsed} ${hintWord}!`;
      document.getElementById('completion-time').innerText = finishTime;
      document.getElementById('completion-hints').innerText = String(hintsUsed);
      document.getElementById('player-name').value = '';
      document.getElementById('score-dialog').showModal();
      document.getElementById('player-name').focus();
    }
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('get-hint').addEventListener('click', getHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  initTheme();
  document.getElementById('score-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('player-name').value.trim();
    if (!name) return;
    try {
      saveScore(name);
      document.getElementById('score-dialog').close();
      document.getElementById('leaderboard-message').innerText = '';
    } catch (error) {
      showLeaderboardError(error);
    }
  });
  document.getElementById('clear-scores').addEventListener('click', () => {
    if (!window.confirm('Clear all saved leaderboard scores?')) return;
    try {
      localStorage.removeItem(LEADERBOARD_KEY);
      renderLeaderboard();
      document.getElementById('leaderboard-message').innerText = '';
    } catch (error) {
      showLeaderboardError(error);
    }
  });
  try {
    renderLeaderboard();
  } catch (error) {
    showLeaderboardError(error);
  }
  // initialize
  newGame();
});