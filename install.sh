#!/usr/bin/env bash
# Terono installer for macOS / Linux
#   curl -fsSL https://raw.githubusercontent.com/Terona-Studios/Terono/main/install.sh | bash
# Builds Vencord with the Terono plugin, installs it into Discord and adds the Terono theme.
# Run it again any time to update.
set -euo pipefail

DIR="${TERONO_DIR:-$HOME/Terono}"
VENCORD="$DIR/Vencord"
PLUGIN="$VENCORD/src/userplugins/terono"

step() { printf '\n\033[36m> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$1"; exit 1; }

command -v git >/dev/null || fail "git is required. Install it, then run this again."
command -v node >/dev/null || fail "Node.js (LTS) is required: https://nodejs.org"

mkdir -p "$DIR"

step "Getting Vencord"
if [ -d "$VENCORD/.git" ]; then git -C "$VENCORD" pull --ff-only; else git clone --depth 1 https://github.com/Vendicated/Vencord "$VENCORD"; fi

step "Getting Terono"
if [ -d "$PLUGIN/.git" ]; then git -C "$PLUGIN" pull --ff-only; else git clone --depth 1 https://github.com/Terona-Studios/Terono "$PLUGIN"; fi

cd "$VENCORD"
PNPM="$(node -p 'require("./package.json").packageManager')"

step "Installing build tools (first run takes a minute)"
npx -y "$PNPM" install --frozen-lockfile

step "Building"
npx -y "$PNPM" build

if [ -n "${TERONO_NO_INJECT:-}" ]; then step "Build finished (TERONO_NO_INJECT set, Discord left untouched)"; exit 0; fi

step "Closing Discord"
pkill -x Discord 2>/dev/null || pkill -x discord 2>/dev/null || true
sleep 2

step "Installing into Discord (may ask for your password on Linux)"
node scripts/runInstaller.mjs -- --install --branch auto

step "Enabling Terono"
node "$PLUGIN/scripts/enable.mjs"

if [ "$(uname)" = "Darwin" ]; then open -a Discord || true; else (nohup discord >/dev/null 2>&1 &) || true; fi

printf '\n\033[32mTerono is installed. Open Settings > Vencord > Plugins > Terono to customize it.\033[0m\n'
