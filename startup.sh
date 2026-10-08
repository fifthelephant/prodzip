#!/usr/bin/env bash
# Install dependencies, build, and host the combined Marwadi Khana website.
# Usage: ./startup.sh (installs, builds, and starts on port 3000)
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

echo "Checking port 3000..."
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS="$(lsof -ti :3000 || true)"
  if [ -n "$PORT_PIDS" ]; then
    echo "Port 3000 is already in use. Stopping existing process..."
    # shellcheck disable=SC2086
    kill $PORT_PIDS 2>/dev/null || true
    sleep 1
    STILL_RUNNING="$(lsof -ti :3000 || true)"
    if [ -n "$STILL_RUNNING" ]; then
      # shellcheck disable=SC2086
      kill -9 $STILL_RUNNING 2>/dev/null || true
    fi
  fi
elif command -v fuser >/dev/null 2>&1; then
  if fuser 3000/tcp >/dev/null 2>&1; then
    echo "Port 3000 is already in use. Stopping existing process..."
    fuser -k 3000/tcp >/dev/null 2>&1 || true
    sleep 1
  fi
fi

echo "Installing dependencies..."
npm install

echo "Building the website..."
npm run build

echo "Marwadi Khana is available at http://localhost:3000"
npx next start -p 3000
