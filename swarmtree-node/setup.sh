#!/usr/bin/env bash
# Swarmtree — install Bee + swarm-cli for the local light-node.
# Idempotent: skips already-installed components. Mirrors the /setup-bee skill.

set -euo pipefail
cd "$(dirname "$0")"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

bold "==> Detecting platform"
PLATFORM=$(uname -s)
case "$PLATFORM" in
  Darwin) ok "macOS" ;;
  Linux)  ok "Linux" ;;
  *) fail "Unsupported: $PLATFORM. On Windows, install WSL2 first then run this from inside it." ;;
esac

bold "==> Checking prerequisites"
command -v curl >/dev/null || fail "curl missing. macOS has it preinstalled; on Linux: sudo apt-get install -y curl"
ok "curl"
command -v node >/dev/null || fail "node missing. Install Node.js v18+ (brew install node, or use nvm)."
NODE_VER=$(node --version | sed 's/^v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || fail "node v$NODE_VER detected; need v18+."
ok "node $(node --version)"
command -v npm >/dev/null || fail "npm missing (comes with node)."
ok "npm $(npm --version)"

bold "==> swarm-cli"
if command -v swarm-cli >/dev/null; then
  ok "already installed: $(swarm-cli --version 2>/dev/null | tail -1)"
else
  warn "installing globally (npm install -g @ethersphere/swarm-cli)…"
  npm install -g @ethersphere/swarm-cli
  ok "installed: $(swarm-cli --version 2>/dev/null | tail -1)"
fi

bold "==> Bee binary"
if command -v bee >/dev/null; then
  ok "already installed: $(bee version 2>/dev/null | head -1)"
else
  warn "fetching latest tag from GitHub…"
  TAG=$(curl -s https://api.github.com/repos/ethersphere/bee/releases/latest \
        | grep -oE '"tag_name":[[:space:]]*"[^"]+"' \
        | sed -E 's/.*"([^"]+)"/\1/')
  [ -n "$TAG" ] || fail "Couldn't fetch latest Bee tag. Check your internet connection."
  ok "latest tag: $TAG"
  warn "installing Bee (sudo required to write to /usr/local/bin)…"
  curl -s https://raw.githubusercontent.com/ethersphere/bee/master/install.sh | TAG="$TAG" sudo bash
  ok "installed: $(bee version 2>/dev/null | head -1)"
fi

bold "==> .env"
if [ -f .env ]; then
  ok ".env already exists (not touching it)"
else
  if [ -f .env.example ]; then
    cp .env.example .env
    ok "created from .env.example — edit it and set BEE_PASSWORD"
  else
    printf 'BEE_PASSWORD=\n' > .env
    ok "created blank — set BEE_PASSWORD before starting"
  fi
fi

bold "==> Done"
cat <<'EOF'

Next steps:

  1.  Open swarmtree-node/.env and set BEE_PASSWORD to something strong.
      SAVE IT in a password manager — losing it means losing wallet access.

  2.  Smoke-test in ultra-light mode (no funding required):
        ./start-ultralight.sh

      In another terminal:  swarm-cli status   →  expect mode: ultralight

  3.  Get your node wallet address:
        swarm-cli addresses

  4.  Fund the wallet on Gnosis Chain (~0.01 xDAI + ~0.2 xBZZ).
      Easiest:  https://fund.ethswarm.org

  5.  Stop ultra-light (Ctrl+C in the start terminal). Start light mode:
        ./start.sh

  6.  Wait for chain sync (swarm-cli status — Δ blocks behind drops below ~10).

  7.  Buy a postage stamp (interactive):
        swarm-cli stamp create

  8.  Restart the app:  cd ../swarmtree-app && npm run dev
      The Stamp dropdown will populate from your local Bee.

EOF
