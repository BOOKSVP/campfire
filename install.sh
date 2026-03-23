#!/bin/bash
# Campfire — One-line install: Raycast extension + background notifier
# Usage: curl -sL https://raw.githubusercontent.com/BOOKSVP/campfire/main/install.sh | bash

set -e

INSTALL_DIR="$HOME/.campfire-raycast"
REPO="https://github.com/BOOKSVP/campfire.git"
PLIST_NAME="com.artsvp.campfire-notifier"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "🔥 Campfire — Full Install"
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

# ── Step 1: Clone or update repo ──

if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "${YELLOW}📦 Existing install found — updating...${NC}"
  cd "$INSTALL_DIR"
  git pull --ff-only origin main 2>/dev/null || git pull origin main
else
  echo "📦 Cloning to $INSTALL_DIR..."
  git clone --depth 1 "$REPO" "$INSTALL_DIR"
fi

# ── Step 2: Build Raycast extension ──

echo -e "${CYAN}🔨 Building Raycast extension...${NC}"
cd "$INSTALL_DIR/raycast"
npm install --silent 2>/dev/null
npm run build 2>/dev/null

# ── Step 3: Install notifier ──

echo -e "${CYAN}🔔 Setting up background notifier...${NC}"
cd "$INSTALL_DIR/notifier"
npm install --silent 2>/dev/null

# Install terminal-notifier if not present
if ! command -v terminal-notifier &> /dev/null; then
  echo -e "${CYAN}📦 Installing terminal-notifier...${NC}"
  if command -v brew &> /dev/null; then
    brew install terminal-notifier 2>/dev/null
  else
    echo -e "${YELLOW}⚠️  Install Homebrew (brew.sh) then run: brew install terminal-notifier${NC}"
    echo "   Notifications will use fallback until installed."
  fi
fi

# ── Step 4: Set up Launch Agent ──

# Stop existing agent if running
launchctl unload "$PLIST_PATH" 2>/dev/null || true

NODE_PATH=$(which node)

cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${INSTALL_DIR}/notifier/index.mjs</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${INSTALL_DIR}/notifier/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${INSTALL_DIR}/notifier/stderr.log</string>
</dict>
</plist>
PLIST

launchctl load "$PLIST_PATH"

echo ""
echo -e "${GREEN}✅ Everything installed!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🔥 Raycast Extension"
echo "     Built at: $INSTALL_DIR/raycast"

# Check if this is first install (no import yet)
if [ ! -d "$INSTALL_DIR/.first_run_done" ]; then
  echo ""
  echo "  📌 One-time setup:"
  echo "     1. Open Raycast"
  echo "     2. Type 'Import Extension'"
  echo "     3. Select: $INSTALL_DIR/raycast"
  echo "     4. Set your name in extension preferences"
  mkdir -p "$INSTALL_DIR/.first_run_done"
fi

echo ""
echo "  🔔 Background Notifier"
echo "     Running as Launch Agent (auto-starts on login)"
echo "     Logs: $INSTALL_DIR/notifier/stdout.log"
echo ""
echo "  🔄 To update: run this same command again"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔥 Done! You'll get macOS notifications when anyone posts."
