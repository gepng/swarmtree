# Swarmtree — Local Bee Node

Runs a Bee light node at `http://localhost:1633` for the swarmtree-app to upload to. This folder mirrors the canonical install path from the `/setup-bee` skill, configured for swarmtree's dev origin (`http://localhost:3000`).

## TL;DR

```bash
./setup.sh                  # install bee + swarm-cli, create .env (one-time)
$EDITOR .env                # set BEE_PASSWORD to something strong
./start-ultralight.sh       # smoke test (download-only, no funding)

# In another terminal:
swarm-cli addresses         # get your node wallet
# Send ~0.01 xDAI + ~0.2 xBZZ on Gnosis Chain to that address.
# Easiest: https://fund.ethswarm.org

# Stop ultra-light (Ctrl+C), then:
./start.sh                  # light mode — uploads + stamps now possible
swarm-cli status            # wait until Δ blocks behind < ~10
swarm-cli stamp create      # interactive stamp purchase
```

Then in `../swarmtree-app`:

```bash
npm install
cp .env.example .env.local    # set VITE_WALLETCONNECT_PROJECT_ID
npm run dev                   # http://localhost:3000
```

The Stamp dropdown auto-populates from this node. See `../swarmtree-app/README.md` for full app setup.

## What each script does

| Script | Mode | Funding? | Use when |
|---|---|---|---|
| `setup.sh` | — | — | First time only. Installs bee + swarm-cli, creates .env. |
| `start-ultralight.sh` | Ultra-light | None | Smoke test before funding. Download-only. |
| `start.sh` | Light | xDAI + xBZZ on Gnosis | Daily use. Required for uploads + stamps. |

## Docker alternative

If you'd rather not install Bee on the host:

```bash
cp .env.example .env
$EDITOR .env                          # set BEE_PASSWORD
docker compose up -d                  # pulls ethersphere/bee:2.7.1, starts in light mode
docker compose logs -f bee            # watch wallet generation + chain sync
npm install -g @ethersphere/swarm-cli # swarm-cli stays on the host
swarm-cli addresses                   # node wallet address (talks to localhost:1633)
# Fund via https://fund.ethswarm.org, then:
swarm-cli status                      # wait Δ < ~10
swarm-cli stamp create
docker compose down                   # stop (data persists in named volume)
docker compose down -v                # stop AND DELETE wallet — only if starting fresh
```

The compose file uses Gnosis Chain **mainnet** with CORS allowed for `http://localhost:3000`. If you want testnet (Sepolia + BEE_MAINNET=false), copy the file and swap RPC + flags — but note testnet stamps don't show up on the public Swarm gateways, so real visitors can't read your uploads.

## Where things live

- **API**: `http://127.0.0.1:1633` (loopback — never publicly exposed)
- **Bee data**: `~/.bee/` by default
- **Wallet keypair**: encrypted with `BEE_PASSWORD` inside the bee data dir
- **`.env`**: `BEE_PASSWORD` and optional `BEE_RPC_ENDPOINT` — gitignored

## CORS

Both scripts set `--cors-allowed-origins "http://localhost:3000"` to match Vite's dev port in `swarmtree-app`. If the dev port changes, update both scripts.

## Funding paths

| Method | Speed | Notes |
|---|---|---|
| https://fund.ethswarm.org | Fastest | Multichain top-up — pay from any chain/token, no bridging |
| `swarm-cli utility redeem <PRIVATE_KEY>` | Instant if you have a Swarm gift code | One command, auto-detects wallet |
| Exchange → withdraw on Gnosis | Medium | Buy BZZ on an exchange, withdraw direct to Gnosis Chain |
| Bridge from Ethereum | Slowest | https://bridge.gnosischain.com/ |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `connection refused` from swarm-cli | Bee is starting; wait 10–30s |
| Browser CORS error from `swarmtree-app` | Did you start with `./start.sh`? It sets the flag; if you ran `bee start` manually, restart through this script |
| Stamp not usable yet | Wait 2–3 min after purchase for network propagation |
| Chain sync stuck (`Δ` not dropping) | Set `BEE_RPC_ENDPOINT=https://rpc.gnosischain.com` in `.env` and restart |
| `bee: command not found` after install | Add `/usr/local/bin` to PATH; or re-run setup.sh |
| Lost password | Wallet is unrecoverable — you'll need a fresh node + new funding. Future you: store the password |

For deeper issues, the `/troubleshoot` skill has a stepwise diagnostic flow.

## Security

- API binds to `127.0.0.1:1633` (loopback). **Never** expose port 1633 to the public internet — it's an admin API.
- Back up `~/.bee/` if you have meaningful BZZ in the chequebook.
- `.env` is gitignored; double-check before pushing.

## References

- Skills: `/setup-bee-interactive` (guided), `/setup-bee` (reference), `/stamps`, `/troubleshoot`, `/docs`
- Quick start: https://docs.ethswarm.org/docs/bee/installation/quick-start
- Fund your node: https://docs.ethswarm.org/docs/bee/installation/fund-your-node
- `bee start --help` for every flag
