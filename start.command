#!/bin/bash
# Double-click in Finder to open the Local AI Office.
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install it with:  brew install node   (or from https://nodejs.org)"
  read -n 1 -s -r -p "Press any key to close"; exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code ('claude') was not found on your PATH."
  read -n 1 -s -r -p "Press any key to close"; exit 1
fi
( sleep 1; open "http://127.0.0.1:${OFFICE_PORT:-4777}" ) &
exec node server.js
