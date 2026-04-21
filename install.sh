#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE20_BIN="/opt/homebrew/opt/node@20/bin"

if [ -d "$NODE20_BIN" ]; then
  export PATH="$NODE20_BIN:$PATH"
fi

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 20.19+ first."
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "corepack is required. Install a Node.js build that includes corepack."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(\".\")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(\".\")[1]')"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 19 ]; }; then
  echo "Node.js 20.19+ is required. Current version: $(node -v)"
  exit 1
fi

corepack enable

if [ ! -f "server/.env" ]; then
  cp "server/.env.example" "server/.env"
  echo "Created server/.env"
fi

if [ ! -f "client/.env" ]; then
  cp "client/.env.example" "client/.env"
  echo "Created client/.env"
fi

if grep -q '^RAG_ENABLED=true' "server/.env"; then
  python3 - <<'PY'
from pathlib import Path
path = Path("server/.env")
text = path.read_text()
if "RAG_ENABLED=true" in text:
    path.write_text(text.replace("RAG_ENABLED=true", "RAG_ENABLED=false", 1))
PY
  echo "Set RAG_ENABLED=false for easier first run."
fi

pnpm install
pnpm build

cat <<'EOF'

Install complete.

Local development:
  bash ./start.sh

Docker / VPS:
  docker compose up -d --build

Then open:
  Frontend: http://127.0.0.1:5173
  Backend:  http://127.0.0.1:3001

Remember to add your model API key in the web settings page before real writing.
EOF
