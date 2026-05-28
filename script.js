const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const FULL_WORDS = window.WORDS;
const SHORTLIST_SIZE = 25;

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const KEY_RANK = { absent: 1, present: 2, correct: 3 };
const STATE_LABELS = {
  correct: "Correct letter and correct place",
  present: "Correct letter but wrong place",
  absent: "Letter is not in the word",
};
const FEEDBACK_MESSAGES = {
  miss: "Not even close. The word remains undefeated.",
  progress: "You are making progress. Keep going.",
  close: "Very close. You are only one letter away.",
};
const FEEDBACK_ASSETS = {
  miss: {
    src: "assets/meme-miss.svg",
    alt: "Angry chihuahua saying not even close",
  },
  progress: {
    src: "assets/meme-progress.svg",
    alt: "Border collie saying keep going",
  },
  close: {
    src: "assets/meme-close.svg",
    alt: "Golden retriever saying one letter away",
  },
};

const board = document.querySelector("#board");
const keyboard = document.querySelector("#keyboard");
const status = document.querySelector("#status");
const memeFeedback = document.querySelector("#meme-feedback");
const memeImage = document.querySelector("#meme-image");
const scoreTotalDisplay = document.querySelector("#score-total");
const lastScoreDisplay = document.querySelector("#last-score");
const roundsWonDisplay = document.querySelector("#rounds-won");
const newGameButton = document.querySelector("#new-game");
const debugPanel = document.querySelector("#debug-panel");
const wordList = document.querySelector("#word-list");
const wordCount = document.querySelector("#word-count");
const congratsModal = document.querySelector("#congrats-modal");
const congratsDialog = congratsModal.querySelector(".modal");
const congratsMessage = document.querySelector("#congrats-message");
const nextRoundButton = document.querySelector("#next-round");
const stayRoundButton = document.querySelector("#stay-round");
const hardToggle = document.querySelector("#hard-toggle");
const timerDisplay = document.querySelector("#timer");

const debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
const TIME_LIMIT = 10;

let answer = "";
let guesses = [];
let currentGuess = "";
let gameOver = false;
let pendingAnswer = "";
let hardMode = false;
let timerId = null;
let timeLeft = TIME_LIMIT;
let totalScore = 0;
let lastRoundScore = 0;
let roundsWon = 0;
let ANSWERS = [];
let VALID_GUESSES = new Set();

function startGame() {
  setActiveWords(createShortlist());
  answer = pickAnswer();
  guesses = [];
  currentGuess = "";
  gameOver = false;
  pendingAnswer = "";
  resetScore();
  hideCongratsModal();
  hideMemeFeedback();
  renderDebugPanel();
  renderBoard();
  renderKeyboard();
  beginRoundTimer();
  setStatus("Guess the 5-letter word in 6 tries.");
}

function startNextRound() {
  answer = pendingAnswer || pickAnswer(answer);
  guesses = [];
  currentGuess = "";
  gameOver = false;
  pendingAnswer = "";
  hideCongratsModal();
  hideMemeFeedback();
  renderDebugPanel();
  renderBoard();
  renderKeyboard();
  beginRoundTimer();
  setStatus("Guess the 5-letter word in 6 tries.");
}

function resetScore() {
  totalScore = 0;
  lastRoundScore = 0;
  roundsWon = 0;
  renderScorePanel();
}

function addRoundScore(guessCount) {
  lastRoundScore = calculateRoundScore(guessCount);
  totalScore += lastRoundScore;
  roundsWon += 1;
  renderScorePanel();
  return lastRoundScore;
}

function calculateRoundScore(guessCount) {
  const incorrectGuesses = guessCount - 1;
  return MAX_GUESSES - incorrectGuesses;
}

function renderScorePanel() {
  scoreTotalDisplay.textContent = String(totalScore);
  lastScoreDisplay.textContent = String(lastRoundScore);
  roundsWonDisplay.textContent = String(roundsWon);
}

function createShortlist() {
  const shuffledWords = [...FULL_WORDS];

  for (let index = shuffledWords.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledWords[index], shuffledWords[randomIndex]] = [shuffledWords[randomIndex], shuffledWords[index]];
  }

  return shuffledWords.slice(0, SHORTLIST_SIZE);
}

function setActiveWords(words) {
  ANSWERS = [...words];
  VALID_GUESSES = new Set(ANSWERS);
}

function beginRoundTimer() {
  syncHardToggle();
  if (hardMode) {
    startTimer();
  } else {
    stopTimer();
    renderTimer();
  }
}

function syncHardToggle() {
  hardToggle.checked = hardMode;
  hardToggle.disabled = guesses.length > 0;
}

function startTimer() {
  stopTimer();
  timeLeft = TIME_LIMIT;
  renderTimer();
  timerId = setInterval(tickTimer, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function tickTimer() {
  timeLeft -= 1;
  if (timeLeft <= 0) {
    timeLeft = 0;
    renderTimer();
    handleTimeUp();
    return;
  }
  renderTimer();
}

function handleTimeUp() {
  stopTimer();
  if (gameOver) return;
  gameOver = true;
  currentGuess = "";
  setStatus(`Time is up. The word was ${answer.toUpperCase()}.`, "loss");
  showMemeFeedback({ ...FEEDBACK_ASSETS.miss, message: FEEDBACK_MESSAGES.miss });
  renderBoard();
  renderKeyboard();
}

function renderTimer() {
  if (!hardMode) {
    timerDisplay.hidden = true;
    return;
  }
  timerDisplay.hidden = false;
  timerDisplay.textContent = `${timeLeft}s`;
  timerDisplay.className = timeLeft <= 3 ? "timer low" : "timer";
}

function pickAnswer(previousAnswer = "") {
  const availableAnswers = ANSWERS.filter((word) => word !== previousAnswer);
  const source = availableAnswers.length > 0 ? availableAnswers : ANSWERS;
  return source[Math.floor(Math.random() * source.length)];
}

function renderDebugPanel() {
  if (!debugMode) return;

  debugPanel.hidden = false;
  wordCount.textContent = `${ANSWERS.length} active words`;
  wordList.innerHTML = "";

  [...ANSWERS].sort().forEach((word) => {
    const item = document.createElement("span");
    item.className = "word-chip";
    item.textContent = word;
    wordList.append(item);
  });
}

function renderBoard() {
  board.innerHTML = "";

  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "row";

    const guess = guesses[rowIndex] ?? (rowIndex === guesses.length ? currentGuess : "");
    const score = guesses[rowIndex] ? scoreGuess(guesses[rowIndex], answer) : [];

    for (let tileIndex = 0; tileIndex < WORD_LENGTH; tileIndex += 1) {
      const tile = document.createElement("div");
      const letter = guess[tileIndex] ?? "";
      const state = score[tileIndex] ?? "";
      tile.className = ["tile", letter ? "filled" : "", state].filter(Boolean).join(" ");
      tile.textContent = letter;
      if (state) {
        tile.dataset.tooltip = STATE_LABELS[state];
        tile.setAttribute("aria-label", `${letter.toUpperCase()}: ${STATE_LABELS[state]}`);
        tile.tabIndex = 0;
      }
      row.append(tile);
    }

    board.append(row);
  }
}

function showCongratsModal(solvedWord, guessCount, roundScore) {
  pendingAnswer = pickAnswer(solvedWord);
  gameOver = true;
  congratsMessage.textContent = `You found ${solvedWord.toUpperCase()} in ${guessCount}/${MAX_GUESSES} for ${roundScore} points. Would you like to play the next one?`;
  congratsModal.hidden = false;
  congratsDialog.focus();
}

function hideCongratsModal() {
  congratsModal.hidden = true;
}

function stayOnSolvedRound() {
  hideCongratsModal();
  setStatus("You win. Choose reset when you are ready for a fresh game.", "win");
}

function renderKeyboard() {
  keyboard.innerHTML = "";
  const letterStates = getKeyboardStates();

  KEY_ROWS.forEach((letters, index) => {
    const row = document.createElement("div");
    row.className = "key-row";

    if (index === 2) {
      row.append(createKey("Enter", "Enter", true));
    }

    [...letters].forEach((letter) => {
      row.append(createKey(letter, letter, false, letterStates[letter]));
    });

    if (index === 2) {
      row.append(createKey("⌫", "Backspace", true));
    }

    keyboard.append(row);
  });
}

function createKey(label, value, wide, state = "") {
  const key = document.createElement("button");
  key.type = "button";
  key.className = ["key", wide ? "wide" : "", state].filter(Boolean).join(" ");
  key.textContent = label;
  key.dataset.key = value;
  key.setAttribute("aria-label", value === "Backspace" ? "Delete" : value);
  key.addEventListener("click", () => handleInput(value));
  return key;
}

function getKeyboardStates() {
  const states = {};

  guesses.forEach((guess) => {
    scoreGuess(guess, answer).forEach((state, index) => {
      const letter = guess[index];
      if (!states[letter] || KEY_RANK[state] > KEY_RANK[states[letter]]) {
        states[letter] = state;
      }
    });
  });

  return states;
}

function scoreGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = {};

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guess[index] === target[index]) {
      result[index] = "correct";
    } else {
      remaining[target[index]] = (remaining[target[index]] ?? 0) + 1;
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    const letter = guess[index];
    if (result[index] !== "correct" && remaining[letter] > 0) {
      result[index] = "present";
      remaining[letter] -= 1;
    }
  }

  return result;
}

function getFeedback(score) {
  const correctCount = score.filter((state) => state === "correct").length;
  const hasAnyMatch = score.some((state) => state === "correct" || state === "present");

  if (correctCount === WORD_LENGTH - 1) {
    return { type: "close", message: FEEDBACK_MESSAGES.close, ...FEEDBACK_ASSETS.close };
  }

  if (!hasAnyMatch) {
    return { type: "miss", message: FEEDBACK_MESSAGES.miss, ...FEEDBACK_ASSETS.miss };
  }

  return { type: "progress", message: FEEDBACK_MESSAGES.progress, ...FEEDBACK_ASSETS.progress };
}

function getFeedbackMessage(score) {
  return getFeedback(score).message;
}

function showMemeFeedback(feedback) {
  memeImage.src = feedback.src;
  memeImage.alt = feedback.alt;
  memeFeedback.hidden = false;
}

function hideMemeFeedback() {
  memeFeedback.hidden = true;
  memeImage.removeAttribute("src");
  memeImage.alt = "";
}

function handleInput(key) {
  if (gameOver) return;

  if (key === "Enter") {
    submitGuess();
    return;
  }

  if (key === "Backspace") {
    currentGuess = currentGuess.slice(0, -1);
    setStatus("Guess the 5-letter word in 6 tries.");
    hideMemeFeedback();
    renderBoard();
    return;
  }

  if (/^[a-z]$/i.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key.toLowerCase();
    setStatus("Guess the 5-letter word in 6 tries.");
    hideMemeFeedback();
    renderBoard();
  }
}

function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    setStatus("Not enough letters.", "error");
    hideMemeFeedback();
    return;
  }

  if (!/^[a-z]{5}$/.test(currentGuess)) {
    setStatus("Use five letters only.", "error");
    hideMemeFeedback();
    return;
  }

  if (!VALID_GUESSES.has(currentGuess)) {
    const invalidGuess = currentGuess;
    currentGuess = "";
    setStatus(`${invalidGuess} is not a valid word`, "error");
    hideMemeFeedback();
    renderBoard();
    return;
  }

  const submittedGuess = currentGuess;
  const submittedScore = scoreGuess(submittedGuess, answer);

  guesses.push(submittedGuess);
  syncHardToggle();

  if (submittedGuess === answer) {
    const solvedWord = answer;
    const guessCount = guesses.length;
    const roundScore = addRoundScore(guessCount);
    currentGuess = "";
    stopTimer();
    renderBoard();
    renderKeyboard();
    setStatus(`Correct in ${guessCount}/${MAX_GUESSES}. +${roundScore} score.`, "win");
    showCongratsModal(solvedWord, guessCount, roundScore);
    return;
  } else if (guesses.length === MAX_GUESSES) {
    const feedback = getFeedback(submittedScore);
    gameOver = true;
    stopTimer();
    setStatus(`The word was ${answer.toUpperCase()}.`, "loss");
    showMemeFeedback(feedback);
  } else {
    const feedback = getFeedback(submittedScore);
    setStatus(`${feedback.message} ${MAX_GUESSES - guesses.length} guesses left.`);
    showMemeFeedback(feedback);
    if (hardMode) startTimer();
  }

  currentGuess = "";
  renderBoard();
  renderKeyboard();
}

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = ["status", type].filter(Boolean).join(" ");
}

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (!congratsModal.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      stayOnSolvedRound();
    }
    return;
  }
  handleInput(event.key);
});

newGameButton.addEventListener("click", startGame);
nextRoundButton.addEventListener("click", startNextRound);
stayRoundButton.addEventListener("click", stayOnSolvedRound);

hardToggle.addEventListener("change", () => {
  if (gameOver || guesses.length > 0) {
    hardToggle.checked = hardMode;
    return;
  }
  hardMode = hardToggle.checked;
  if (hardMode) {
    startTimer();
  } else {
    stopTimer();
    renderTimer();
  }
});

startGame();
