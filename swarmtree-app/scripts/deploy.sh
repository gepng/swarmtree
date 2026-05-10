#!/usr/bin/env bash
# Build swarmtree-app and upload dist/ to Swarm via the local Bee node.
# Outputs the manifest hash to copy into your ENS Content Hash record.
#
# Usage:
#   ./scripts/deploy.sh                # auto-picks first usable stamp
#   BATCH_ID=<hex> ./scripts/deploy.sh # use a specific stamp
#   BEE_API_URL=http://... ./scripts/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

BEE_API="${BEE_API_URL:-http://localhost:1633}"

bold "==> Verifying Bee is reachable at $BEE_API"
curl -sf "$BEE_API/health" >/dev/null || fail "Can't reach Bee. Is it running? (cd ../swarmtree-node && docker compose up -d)"
ok "Bee is up"

bold "==> Resolving postage stamp"
if [ -n "${BATCH_ID:-}" ]; then
  ok "Using BATCH_ID from env: $BATCH_ID"
else
  BATCH_ID=$(curl -s "$BEE_API/stamps" \
    | python3 -c 'import json,sys
data=json.load(sys.stdin)
usable=[b for b in data.get("stamps",[]) if b.get("usable")]
print(usable[0]["batchID"] if usable else "")')
  [ -n "$BATCH_ID" ] || fail "No usable stamps. Buy one with: swarm-cli stamp create"
  ok "Auto-picked first usable stamp: $BATCH_ID"
fi

bold "==> Building app"
npm run build
[ -d dist ] || fail "Build did not produce dist/."
ok "Built dist/ ($(du -sh dist | cut -f1))"

bold "==> Uploading dist/ to Swarm"
# --error-document falling through to index.html so deep links survive even
# though the SPA uses HashRouter (defensive — costs nothing).
RESULT=$(swarm-cli upload ./dist \
  --stamp "$BATCH_ID" \
  --index-document index.html \
  --error-document index.html 2>&1)

echo "$RESULT"

# Pull the manifest hash out of swarm-cli's output (line like "Swarm hash: <hex>")
HASH=$(echo "$RESULT" | grep -oE '[0-9a-f]{64}' | head -1)
[ -n "$HASH" ] || fail "Couldn't parse manifest hash from swarm-cli output."

bold "==> Done"
cat <<EOF

  Manifest hash:
    $HASH

  Local preview (your Bee, no gate):
    $BEE_API/bzz/$HASH/

  Public gateway (gated unless you set ENS contenthash):
    https://download.gateway.ethswarm.org/bzz/$HASH/

  Make it live at <name>.eth.limo:
    1.  Go to  https://app.ens.domains/<your-name>.eth
    2.  Records tab → add/edit Content Hash:
          bzz://$HASH
    3.  Confirm the tx (Ethereum mainnet, ETH gas).
    4.  Visit https://<your-name>.eth.limo/ — page is live.

EOF
