# Custom Wordle

A small browser-based Wordle clone with a custom five-letter word list.

The success modal uses `assets/party-captain.gif`.

The guess feedback memes use:

- `assets/meme-miss.svg`
- `assets/meme-progress.svg`
- `assets/meme-close.svg`

Regenerate them with:

```bash
node scripts/generate-meme-assets.js
```

## Run

Open `index.html` in a browser.

Or run a local server:

```bash
chmod +x run-local.sh
./run-local.sh
```

Then open `http://localhost:8000`.

To use a different port:

```bash
PORT=3000 ./run-local.sh
```

## Customize the word list

Edit `assets/words.txt`, then regenerate `words.js`:

```bash
node scripts/generate-words.js
```

Each fresh game randomly picks a 25-word answer list from the full list. Target words come from the active short list, while guesses are valid if they exist in the full list. Invalid guesses clear the current row without costing a try.

## Debug mode

To inspect the active 25-word short list, run the app and open:

```text
http://localhost:8000?debug=1
```

## Test

Run the basic state tests:

```bash
chmod +x test.sh
./test.sh
```

## Deploy

Pushing to `main` deploys the static site to GitHub Pages through `.github/workflows/pages.yml`.

One-time repository setup is required by a repo admin:

1. Open `Settings > Pages`.
2. Set the Pages source to `GitHub Actions`.
3. Re-run the latest `Deploy GitHub Pages` workflow, or push another commit to `main`.

## Current rules

- One hidden 5-letter word
- 6 guesses
- A correct guess shows a `You win` modal and asks whether to play the next word
- Winning score is `6 - incorrect guesses`
- Continuing to the next word keeps adding to the running score
- Starting a fresh game with reset clears the score
- Green means correct letter and position
- Yellow means correct letter in the wrong position
- Gray means the letter is not available in the answer
- Hover or focus a scored letter to see what its color means
- Non-winning guesses show one of three meme-style messages: no matches, progress, or one-letter-away
- Physical keyboard and on-screen keyboard are both supported
