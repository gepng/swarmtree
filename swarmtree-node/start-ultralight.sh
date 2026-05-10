#!/usr/bin/env bash
# Start Bee in ULTRA-LIGHT mode (download-only, no funding required).
# Use this for the first install smoke test before funding the node.

set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing .env — run ./setup.sh first." >&2; exit 1; }
set -a; source .env; set +a

[ -n "${BEE_PASSWORD:-}" ] || { echo "BEE_PASSWORD not set in .env." >&2; exit 1; }

cat <<'EOF'
Starting Bee in ULTRA-LIGHT mode
  API:  http://127.0.0.1:1633
  CORS: http://localhost:3000

  This mode can DOWNLOAD only — uploads need light mode (./start.sh) + funding.
  Stop with Ctrl+C.

EOF

exec bee start \
  --password "$BEE_PASSWORD" \
  --api-addr 127.0.0.1:1633 \
  --cors-allowed-origins "http://localhost:3000"
