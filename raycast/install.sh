#!/bin/bash
# Campfire Raycast Extension — Install / Update
# Usage: curl -sL https://raw.githubusercontent.com/BOOKSVP/campfire/main/raycast/install.sh | bash

set -e

INSTALL_DIR="$HOME/.campfire-raycast"
REPO="https://github.com/BOOKSVP/campfire.git"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🔥 Campfire Raycast Extension"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check dependencies
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm is required. Install Node.js from https://nodejs.org"
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  # Update existing installation
  echo -e "${YELLOW}📦 Existing install found — updating...${NC}"
  cd "$INSTALL_DIR"
  git pull --ff-only origin main
  cd raycast
  npm install --silent
  npm run build 2>/dev/null
  echo ""
  echo -e "${GREEN}✅ Updated! Raycast will pick up changes automatically.${NC}"
else
  # Fresh install
  echo "📦 Installing to $INSTALL_DIR..."
  git clone --depth 1 "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR/raycast"
  echo "📦 Installing dependencies..."
  npm install --silent
  echo "🔨 Building..."
  npm run build 2>/dev/null
  echo ""
  echo -e "${GREEN}✅ Built successfully!${NC}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📌 One last step:"
  echo ""
  echo "  1. Open Raycast"
  echo "  2. Go to Settings → Extensions → +"
  echo "  3. Click 'Import Extension'"
  echo "  4. Select: $INSTALL_DIR/raycast"
  echo ""
  echo "Then set your name in the extension preferences."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "🔥 Done!"
