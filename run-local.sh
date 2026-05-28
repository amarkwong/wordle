#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

echo "Serving Custom Wordle at http://localhost:${PORT}"
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT"
