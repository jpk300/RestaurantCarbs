#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install Node 18+ and try again." >&2
  exit 1
fi

echo "Starting Restaurant Carbs Finder from: $SCRIPT_DIR"
node server.js
