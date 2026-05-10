# Swarmtree — App

Linktree-style profile builder that publishes static pages to Swarm and binds them to ENS. React + Vite + Tailwind + wagmi + RainbowKit + bee-js.

The app talks to a **local Bee light node** (sibling `../swarmtree-node`) for uploads and stamp listing, plus public Ethereum/Gnosis RPCs for ENS reads and contenthash writes.

## Prerequisites

- **Node 20+** and npm
- **A running Bee light node** at `http://localhost:1633` — see `../swarmtree-node/README.md`. The node must be:
  - Started in light mode (uploads + stamps require funding)
  - Started with `--cors-allowed-origins "http://localhost:3000"` so the browser can hit it
  - Holding at least one usable postage stamp (`swarm-cli stamp create`)
- **WalletConnect Cloud project ID** (free) — https://cloud.walletconnect.com. Without it injected wallets like MetaMask still work, but WalletConnect QR flows do not.
- *(Optional)* **Alchemy API key** for ENS / Gnosis RPC. Without it the app falls through to public RPCs (LlamaRPC, Blast, gnosischain.com, gateway.fm) — fine for dev, occasionally rate-limited.

## Setup

```bash
cd swarmtree-app
npm install
cp .env.example .env.local
$EDITOR .env.local           # set VITE_WALLETCONNECT_PROJECT_ID; optional VITE_ALCHEMY_API_KEY
```

Default `.env` values point at the local Bee node and the public download gateway — leave them as-is unless you're running Bee on a non-default port.

## Run

```bash
npm run dev                  # http://localhost:3000  (strictly that port — required for Bee CORS)
```

The dev server uses `--strictPort`, so port 3000 must be free. If you change it, update `--cors-allowed-origins` on the Bee node to match.

### What you should see

1. Landing page → **Connect Wallet** (MetaMask / WalletConnect).
2. After connect, the dashboard loads. The **Stamp** dropdown is auto-populated from your local Bee node — if it's empty:
   - The node isn't running, or
   - It's running in ultra-light mode, or
   - You haven't bought a stamp yet (`swarm-cli stamp create`), or
   - CORS is wrong (Bee not started with `--cors-allowed-origins "http://localhost:3000"`).
3. Verify an ENS name you own → fill the form → **Save & upload**. The app uploads through your Bee node and gives you a `download.gateway.ethswarm.org/bzz/<hash>/` URL plus an in-app `/u/<address>` route.

## Environment variables

All variables prefixed `VITE_` are baked into the client bundle at build time — never put secrets in them. Defaults live in `src/lib/wagmi.ts` and `src/pages/Dashboard.tsx`.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BEE_API_URL` | `http://localhost:1633` | Local Bee node — uploads + stamp listing |
| `VITE_SWARM_READ_URL` | `https://download.gateway.ethswarm.org` | Public gateway used to construct shareable URLs (use `download.gateway`, not `api.gateway` — the latter blocks HTML) |
| `VITE_WALLETCONNECT_PROJECT_ID` | — | Required for WalletConnect QR; injected wallets work without it |
| `VITE_ALCHEMY_API_KEY` | — | Optional. Improves RPC reliability for ENS + Gnosis. Lock the key with Alchemy's Allowed Origins |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:3000` with HMR |
| `npm run build` | TypeScript check + production bundle to `dist/` |
| `npm run preview` | Serve `dist/` locally to sanity-check the build |
| `npm run lint` | ESLint over the project |

## Deploying the app to Swarm

The app itself can be hosted on Swarm too:

```bash
npm run build
swarm-cli upload dist \
  --index-document index.html \
  --error-document index.html \
  --stamp <BATCH_ID>
```

`--error-document index.html` is required for client-side routing (React Router) to work on deep links. Verify on `https://download.gateway.ethswarm.org/bzz/<HASH>/`, then optionally set an ENS name's contenthash to `bzz://<HASH>` at https://app.ens.domains.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Stamp dropdown empty | Bee not running, ultra-light mode, no stamp purchased, or CORS misconfigured |
| Upload fails with CORS error | Restart Bee with `--cors-allowed-origins "http://localhost:3000"` |
| WalletConnect QR doesn't open | `VITE_WALLETCONNECT_PROJECT_ID` missing in `.env.local` |
| Public URL 404s right after upload | Wait ~10s for chunk propagation, or pass `deferred: false` (already the default) |
| HTML page redirects to "forbidden" | You're using `api.gateway.ethswarm.org` — switch to `download.gateway.ethswarm.org` |
| ENS verify spinner never resolves | RPC rate-limited — set `VITE_ALCHEMY_API_KEY` |

For Bee-side issues (sync, stamps, funding), see `../swarmtree-node/README.md`.

## Project layout

```
src/
  pages/        Dashboard.tsx (editor), Profile.tsx (read view), Landing.tsx
  components/   PhonePreview, HexBg, ui/ (shadcn primitives)
  lib/          wagmi config, bee-js upload helpers, profile generator, contenthash encoder
  hooks/        useStamp (Bee stamps), useExistingProfile (ENS contenthash → fetch)
  abi/          Minimal ENS Registry / NameWrapper / PublicResolver ABIs
```

## References

- `../swarmtree-node/README.md` — local Bee node setup
- `../PRD.md`, `../PRD-upload.md` — product scope and architecture decisions
- bee-js: https://bee-js.ethswarm.org/docs/
- wagmi: https://wagmi.sh
- RainbowKit: https://rainbowkit.com
- Swarm host-your-website guide: https://docs.ethswarm.org/docs/develop/host-your-website/
