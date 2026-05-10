#!/usr/bin/env bash
# Start Bee in LIGHT mode (uploads + stamps work; needs funding).

set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing .env — run ./setup.sh first." >&2; exit 1; }
set -a; source .env; set +a

[ -n "${BEE_PASSWORD:-}" ] || { echo "BEE_PASSWORD not set in .env." >&2; exit 1; }

RPC="${BEE_RPC_ENDPOINT:-https://xdai.fairdatasociety.org}"

cat <<EOF
Starting Bee in LIGHT mode
  API:  http://127.0.0.1:1633
  CORS: http://localhost:3000   (Swarmtree dev origin)
  RPC:  $RPC

  Stop with Ctrl+C.

EOF

exec bee start \
  --password "$BEE_PASSWORD" \
  --swap-enable \
  --api-addr 127.0.0.1:1633 \
  --cors-allowed-origins "http://localhost:3000" \
  --blockchain-rpc-endpoint "$RPC"
