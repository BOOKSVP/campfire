#!/bin/bash
# Campfire Raycast Extension — Install / Update
# Usage: curl -sL https://raw.githubusercontent.com/BOOKSVP/campfire/main/install.sh | bash

set -e

INSTALL_DIR="$HOME/.campfire-raycast"
REPO="https://github.com/BOOKSVP/campfire.git"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🔥 Campfire — Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Install from https://nodejs.org"
  exit 1
fi

# Stop old notifier if it exists
launchctl unload "$HOME/Library/LaunchAgents/com.artsvp.campfire-notifier.plist" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.artsvp.campfire-notifier.plist" 2>/dev/null

if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "${YELLOW}📦 Updating...${NC}"
  cd "$INSTALL_DIR"
  git pull --ff-only origin main 2>/dev/null || git pull origin main
else
  echo "📦 Installing to $INSTALL_DIR..."
  git clone --depth 1 "$REPO" "$INSTALL_DIR"
fi

echo "🔨 Building Raycast extension..."
cd "$INSTALL_DIR/raycast"
npm install --silent 2>/dev/null
npm run build 2>/dev/null

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "  📌 First time? Open Raycast → type 'Import Extension' → select:"
echo "     $INSTALL_DIR/raycast"
echo ""
echo "  🔔 For notifications: open campfire.artsvp.com and allow notifications"
echo ""
echo "🔥 That's it!"
