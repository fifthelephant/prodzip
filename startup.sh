#!/usr/bin/env bash
# Install dependencies, build, and host the combined Marwadi Khana website.
# Usage: ./startup.sh (defaults to port 3001; set PORT to override)
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install it from https://nodejs.org and run this script again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required and is included with Node.js. Install Node.js from https://nodejs.org."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20 or newer is required. Found $(node -v)."
  exit 1
fi

echo "Installing dependencies..."
npm install

echo "Building the website..."
npm run build

PORT="${PORT:-3001}"
echo "Marwadi Khana is available at http://localhost:${PORT}"
npx next start -p "$PORT"
