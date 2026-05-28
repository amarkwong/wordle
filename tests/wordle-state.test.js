const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

assert.ok(fs.existsSync("assets/party-captain.gif"), "success GIF asset should exist locally");
["assets/meme-miss.svg", "assets/meme-progress.svg", "assets/meme-close.svg"].forEach((asset) => {
  assert.ok(fs.existsSync(asset), `${asset} should exist locally`);
  assert.match(fs.readFileSync(asset, "utf8"), /href="data:image\/jpeg;base64,/, `${asset} should embed its source JPG`);
});
assert.match(
  fs.readFileSync("index.html", "utf8"),
  /src="assets\/party-captain\.gif"/,
  "success modal should use the local GIF asset"
);
assert.doesNotMatch(
  fs.readFileSync("index.html", "utf8"),
  /meme-caption/,
  "meme feedback should serve only the SVG asset without extra caption text"
);

function createElement() {
  let html = "";

  return {
    hidden: false,
    textContent: "",
    className: "",
    dataset: {},
    children: [],
    tabIndex: undefined,
    focusCalled: false,
    listeners: {},
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      this.children = [];
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    removeAttribute(name) {
      delete this[name];
    },
    focus() {
      this.focusCalled = true;
    },
    querySelector(selector) {
      if (selector === ".modal") return this.modal;
      return null;
    },
  };
}

function createHarness(search = "") {
  const elements = {
    "#board": createElement(),
    "#keyboard": createElement(),
    "#status": createElement(),
    "#meme-feedback": createElement(),
    "#meme-image": createElement(),
    "#score-total": createElement(),
    "#last-score": createElement(),
    "#rounds-won": createElement(),
    "#new-game": createElement(),
    "#debug-panel": createElement(),
    "#word-list": createElement(),
    "#word-count": createElement(),
    "#congrats-modal": createElement(),
    "#congrats-message": createElement(),
    "#next-round": createElement(),
    "#stay-round": createElement(),
    "#hard-toggle": createElement(),
    "#timer": createElement(),
  };

  elements["#timer"].hidden = true;

  elements["#debug-panel"].hidden = true;
  elements["#meme-feedback"].hidden = true;
  elements["#congrats-modal"].hidden = true;
  elements["#congrats-modal"].modal = createElement();

  const listeners = {};
  const context = {
    console,
    URLSearchParams,
    Math,
    setInterval: () => 1,
    clearInterval: () => {},
    window: { location: { search } },
    document: {
      querySelector(selector) {
        return elements[selector];
      },
      createElement,
      addEventListener(type, handler) {
        listeners[type] = handler;
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("script.js", "utf8"), context);

  return {
    context,
    elements,
    listeners,
    run(code) {
      return vm.runInContext(code, context);
    },
  };
}

function boardRows(elements) {
  return elements["#board"].children;
}

function boardTiles(elements) {
  return boardRows(elements).flatMap((row) => row.children);
}

function submitGuess(harness, guess) {
  harness.run(`currentGuess = "${guess}"; submitGuess();`);
}

function runJson(harness, expression) {
  return JSON.parse(harness.run(`JSON.stringify(${expression})`));
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  assert.strictEqual(run("WORD_LENGTH"), 5, "game should use five-letter words");
  assert.strictEqual(run("MAX_GUESSES"), 6, "game should allow six standard guesses");
  assert.strictEqual(boardRows(elements).length, 6, "board should render six rows");
  assert.strictEqual(boardTiles(elements).length, 30, "board should render 30 tiles");
  assert.strictEqual(elements["#keyboard"].children.length, 3, "keyboard should render three rows");
  assert.strictEqual(elements["#meme-feedback"].hidden, true, "meme feedback should start hidden");
  assert.strictEqual(elements["#score-total"].textContent, "0", "score should start at zero");
  assert.strictEqual(elements["#last-score"].textContent, "0", "last score should start at zero");
  assert.strictEqual(elements["#rounds-won"].textContent, "0", "wins should start at zero");
  assert.match(elements["#status"].textContent, /5-letter word in 6 tries/);
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('["a", "b", "o", "u", "t", "z"].forEach(handleInput);');
  assert.strictEqual(run("currentGuess"), "about", "typing should stop at five letters");

  run('handleInput("Backspace")');
  assert.strictEqual(run("currentGuess"), "abou", "backspace should remove one letter");

  run('handleInput("Enter")');
  assert.strictEqual(elements["#status"].textContent, "Not enough letters.", "short guesses should be rejected");
  assert.match(elements["#status"].className, /error/);
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('answer = "world"');
  submitGuess(harness, "zzzzz");

  assert.strictEqual(run("guesses.length"), 1, "five-letter guesses outside the target list should still count");
  assert.strictEqual(elements["#status"].textContent, "Not even close. The word remains undefeated. 5 guesses left.");
  assert.strictEqual(elements["#meme-image"].src, "assets/meme-miss.svg");
  assert.doesNotMatch(elements["#status"].className, /error/);
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('answer = "world"');
  submitGuess(harness, "about");

  assert.deepStrictEqual(runJson(harness, "guesses"), ["about"], "valid wrong guesses should be recorded");
  assert.strictEqual(run("currentGuess"), "", "current guess should clear after submit");
  assert.strictEqual(elements["#status"].textContent, "You are making progress. Keep going. 5 guesses left.");
  assert.strictEqual(elements["#meme-feedback"].hidden, false, "progress feedback should show a meme asset");
  assert.strictEqual(elements["#meme-image"].src, "assets/meme-progress.svg");
  assert.strictEqual(elements["#congrats-modal"].hidden, true, "wrong guesses should not show the win modal");
}

{
  const harness = createHarness();
  const { run } = harness;

  assert.deepStrictEqual(
    runJson(harness, 'scoreGuess("about", "audio")'),
    ["correct", "absent", "present", "present", "absent"],
    "scoring should mark correct, present, and absent letters"
  );
  assert.deepStrictEqual(
    runJson(harness, 'scoreGuess("eerie", "green")'),
    ["present", "present", "present", "absent", "absent"],
    "scoring should not over-credit duplicate letters"
  );
  assert.strictEqual(
    run('getFeedbackMessage(scoreGuess("agent", "world"))'),
    "Not even close. The word remains undefeated.",
    "feedback should be mean when nothing matches"
  );
  assert.strictEqual(
    run('getFeedback(scoreGuess("agent", "world")).src'),
    "assets/meme-miss.svg",
    "miss feedback should use the chihuahua meme"
  );
  assert.strictEqual(
    run('getFeedbackMessage(scoreGuess("about", "audio"))'),
    "You are making progress. Keep going.",
    "feedback should encourage partial progress"
  );
  assert.strictEqual(
    run('getFeedback(scoreGuess("about", "audio")).src'),
    "assets/meme-progress.svg",
    "progress feedback should use the border collie meme"
  );
  assert.strictEqual(
    run('getFeedbackMessage(scoreGuess("worlz", "world"))'),
    "Very close. You are only one letter away.",
    "feedback should flag guesses with four green letters"
  );
  assert.strictEqual(
    run('getFeedback(scoreGuess("worlz", "world")).src'),
    "assets/meme-close.svg",
    "close feedback should use the golden retriever meme"
  );
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('answer = "about"');
  submitGuess(harness, "about");

  const firstRow = boardRows(elements)[0];
  const firstRowText = firstRow.children.map((tile) => tile.textContent).join("");

  assert.strictEqual(firstRowText, "about", "winning row should stay visible behind the modal");
  assert.strictEqual(elements["#congrats-modal"].hidden, false, "win should show the congrats modal");
  assert.strictEqual(run("answer"), "about", "win should not immediately advance to the next target");
  assert.strictEqual(run("gameOver"), true, "game should pause while the win modal is shown");
  assert.match(elements["#status"].textContent, /Correct in 1\/6\. \+6 score\./);
  assert.match(elements["#congrats-message"].textContent, /Would you like to play the next one\?/);
  assert.strictEqual(elements["#score-total"].textContent, "6", "solving on the first guess should add six points");
  assert.strictEqual(elements["#last-score"].textContent, "6");
  assert.strictEqual(elements["#rounds-won"].textContent, "1");
  assert.ok(elements["#congrats-modal"].modal.focusCalled, "win modal should receive focus");

  const firstTile = firstRow.children[0];
  assert.strictEqual(firstTile.dataset.tooltip, "Correct letter and correct place");
  assert.strictEqual(firstTile["aria-label"], "A: Correct letter and correct place");

  run("startNextRound()");

  assert.strictEqual(elements["#congrats-modal"].hidden, true, "next round should close the modal");
  assert.notStrictEqual(run("answer"), "about", "next round should select a different target when possible");
  assert.strictEqual(run("guesses.length"), 0, "next round should clear previous guesses");
  assert.strictEqual(boardTiles(elements).every((tile) => tile.textContent === ""), true, "next round should clear the board");
  assert.strictEqual(elements["#meme-feedback"].hidden, true, "next round should hide meme feedback");
  assert.strictEqual(elements["#score-total"].textContent, "6", "next round should keep the running score");
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('answer = "world"');
  submitGuess(harness, "agent");
  submitGuess(harness, "alert");
  submitGuess(harness, "world");

  assert.strictEqual(run("calculateRoundScore(3)"), 4, "score should be six minus incorrect guesses");
  assert.strictEqual(elements["#score-total"].textContent, "4", "third-guess solve should add four points");
  assert.strictEqual(elements["#last-score"].textContent, "4");
  assert.strictEqual(elements["#rounds-won"].textContent, "1");

  run("startNextRound(); answer = 'about';");
  submitGuess(harness, "about");

  assert.strictEqual(elements["#score-total"].textContent, "10", "score should accumulate across continued rounds");
  assert.strictEqual(elements["#last-score"].textContent, "6");
  assert.strictEqual(elements["#rounds-won"].textContent, "2");

  run("startGame()");

  assert.strictEqual(elements["#score-total"].textContent, "0", "fresh game reset should clear total score");
  assert.strictEqual(elements["#last-score"].textContent, "0");
  assert.strictEqual(elements["#rounds-won"].textContent, "0");
}

{
  const harness = createHarness();
  const { elements, run } = harness;
  const wrongGuesses = ["agent", "alert", "audio", "beach", "brain", "chair"];

  run('answer = "world"');
  wrongGuesses.forEach((guess) => submitGuess(harness, guess));

  assert.strictEqual(run("guesses.length"), 6, "six wrong valid guesses should be allowed");
  assert.strictEqual(run("gameOver"), true, "game should end after six wrong guesses");
  assert.strictEqual(elements["#status"].textContent, "The word was WORLD.");
  assert.match(elements["#status"].className, /loss/);
}

{
  const harness = createHarness("?debug=1");
  const { elements, run } = harness;

  assert.strictEqual(elements["#debug-panel"].hidden, false, "debug mode should reveal the word list");
  assert.strictEqual(elements["#word-count"].textContent, `${run("ANSWERS.length")} words`);
  assert.strictEqual(elements["#word-list"].children.length, run("ANSWERS.length"));
  assert.strictEqual(elements["#word-list"].children[0].textContent, "about", "debug words should render sorted");
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  assert.strictEqual(run("hardMode"), false, "hard mode should start disabled");
  assert.strictEqual(elements["#timer"].hidden, true, "timer should be hidden in normal mode");

  elements["#hard-toggle"].checked = true;
  elements["#hard-toggle"].listeners.change();

  assert.strictEqual(run("hardMode"), true, "toggling the checkbox should enable hard mode");
  assert.strictEqual(run("timeLeft"), 10, "enabling hard mode should arm a 10-second timer");
  assert.strictEqual(elements["#timer"].hidden, false, "timer should be visible in hard mode");
  assert.strictEqual(elements["#timer"].textContent, "10s");
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run("hardMode = true; startTimer();");
  run("tickTimer();");
  assert.strictEqual(run("timeLeft"), 9, "each tick should remove one second");
  assert.strictEqual(elements["#timer"].textContent, "9s");

  run("tickTimer(); tickTimer(); tickTimer(); tickTimer(); tickTimer();");
  assert.strictEqual(run("timeLeft"), 4);
  assert.strictEqual(elements["#timer"].className, "timer", "timer should look normal above three seconds");

  run("tickTimer();");
  assert.strictEqual(elements["#timer"].className, "timer low", "timer should flag the final three seconds");
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run('answer = "world"; hardMode = true; startTimer();');
  run("for (let i = 0; i < 10; i += 1) tickTimer();");

  assert.strictEqual(run("gameOver"), true, "running out of time should end the round");
  assert.strictEqual(run("timeLeft"), 0, "timer should bottom out at zero");
  assert.strictEqual(elements["#status"].textContent, "Time is up. The word was WORLD.");
  assert.match(elements["#status"].className, /loss/);
  assert.strictEqual(elements["#meme-feedback"].hidden, false, "timeout should show the miss meme");
  assert.strictEqual(elements["#meme-image"].src, "assets/meme-miss.svg");
}

{
  const harness = createHarness();
  const { elements, run } = harness;

  run("hardMode = true; startGame();");
  assert.strictEqual(elements["#hard-toggle"].disabled, false, "toggle should be armed on a fresh round");

  run('answer = "world"');
  submitGuess(harness, "about");

  assert.strictEqual(elements["#hard-toggle"].disabled, true, "toggle should lock once a round is underway");
  assert.strictEqual(run("timeLeft"), 10, "a valid guess should reset the timer for the next row");

  run("startNextRound()");
  assert.strictEqual(elements["#hard-toggle"].disabled, false, "next round should re-arm the toggle");
}

console.log("wordle state tests passed");
