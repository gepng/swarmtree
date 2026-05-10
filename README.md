# Swarmtree

A Linktree-inspired app where every profile page is hosted on [Swarm](https://www.ethswarm.org/) and identified by an Ethereum wallet. Your **wallet is your account**, your **profile lives on Swarm**, and your **eth.limo URL is your homepage** — no central server, no SaaS account.

> *"Your links page, hash-addressed, wallet-owned, no servers."*

## What's in this repo

| Folder | What it is |
|---|---|
| [swarmtree-app/](swarmtree-app/) | The web app — Vite + React + TypeScript, wallet connect via wagmi/RainbowKit, Swarm uploads via [`@ethersphere/bee-js`](https://github.com/ethersphere/bee-js) |
| [swarmtree-node/](swarmtree-node/) | Scripts and Docker compose for running a local [Bee](https://docs.ethswarm.org/) light node that the app uploads through |
| [PRD.md](PRD.md) | Product requirements — vision, scope, architecture, demo script |
| [PRD-upload.md](PRD-upload.md) | Upload-flow PRD covering the Bee + stamp integration |

## How it works

- Profiles are JSON files uploaded to Swarm and addressed by content hash
- Wallet connect (MetaMask + WalletConnect) maps an Ethereum address → profile hash
- ENS names resolve to addresses, so `alice.eth` works as a profile lookup
- Reads go through public Swarm gateways; writes go through your **local Bee node**

## Why the app isn't hosted right now

Swarm has a sharp asymmetry: **reads are free via public gateways, but writes require a funded Bee node and a postage stamp**. The current upload flow in `swarmtree-app` talks directly to a Bee API at `http://localhost:1633`, which means anyone running the app needs the [swarmtree-node](swarmtree-node/) setup running locally:

1. A Bee light node syncing Gnosis Chain
2. A wallet funded with xDAI (gas) and xBZZ (storage)
3. A purchased postage stamp the app can use to upload

Hosting the app publicly without solving this — a hosted relay Bee, a managed stamp, or a per-user write path — would mean every visitor sees a broken upload button. Until that graduation path lands (see `PRD.md` §12), the app runs locally against your own Bee.


See [swarmtree-node/README.md](swarmtree-node/README.md) for the full Bee setup, funding paths, and Docker alternative.
