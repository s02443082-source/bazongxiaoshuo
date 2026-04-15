#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE20_BIN="/opt/homebrew/opt/node@20/bin"

if [ -d "$NODE20_BIN" ]; then
  export PATH="$NODE20_BIN:$PATH"
fi

cd "$ROOT_DIR"

if [ ! -f "server/.env" ]; then
  cp "server/.env.example" "server/.env"
  echo "Created server/.env from template. Review it before exposing the app publicly."
fi

if grep -q '^RAG_ENABLED=true' "server/.env"; then
  echo "Tip: if you do not use Qdrant yet, set RAG_ENABLED=false in server/.env for easier first run."
fi

pnpm dev
