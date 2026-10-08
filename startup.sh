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

echo "Installing dependencies..."
npm install

echo "Building the website..."
npm run build

echo "Marwadi Khana is available at http://localhost:3000"
npx next start -p 3000
