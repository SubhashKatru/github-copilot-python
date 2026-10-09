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
  input.className = 'sudoku-cell prefilled';
  hintsUsed += 1;
  document.getElementById('hint-count').innerText = `Hints used: ${hintsUsed}`;
  msg.innerText = '';
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
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
    if (!gameCompleted) {
      gameCompleted = true;
      window.clearInterval(timerInterval);
      updateTimer();
      document.getElementById('completion-time').innerText = formatTime(elapsedSeconds());
      document.getElementById('player-name').value = '';
      document.getElementById('score-dialog').showModal();
      document.getElementById('player-name').focus();
    }
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('get-hint').addEventListener('click', getHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
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