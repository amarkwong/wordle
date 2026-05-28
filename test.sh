#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

node --check script.js
node --check words.js
node --check scripts/generate-words.js
node --check scripts/generate-meme-assets.js
node --check tests/wordle-state.test.js
node tests/wordle-state.test.js
