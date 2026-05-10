---
name: swarmtree-deploy
description: Swarmtree project Swarm workflow. Uses a local Bee light node (per the user's decision) for uploads + stamp management. Use for any Swarm-related question in this project: deploying the SPA, uploading profile pages, reading/sharing them, troubleshooting the upload flow, or planning v2 graduation paths. PRD lives at /Users/Gediminas/Desktop/swarmtree/PRD-upload.md.
user-invocable: true
---

# Swarmtree — Project Swarm Workflow (light-node architecture)

Project-specific guide for **Swarmtree**, a Linktree clone on Swarm. Updated 2026-05-10 for the local-Bee-light-node architecture; supersedes earlier Beeport-gateway-based guidance.

Source-of-truth docs:
- Project PRD addendum: `/Users/Gediminas/Desktop/swarmtree/PRD-upload.md`
- Main PRD (read-first scope): `/Users/Gediminas/Desktop/swarmtree/PRD.md`
- Sibling skills: `/setup-bee`, `/setup-bee-interactive`, `/stamps`, `/upload-download`, `/feed`, `/host-website`, `/troubleshoot`, `/docs`

## Architecture (current)

```
Browser (SPA on http://localhost:3000)
   │
   │  bee-js: bee.uploadFiles(batchId, [file], { indexDocument, deferred:false })
   │  bee-js: bee.getPostageBatches()
   ▼
Local Bee light node (http://localhost:1633)
   │  Started with --cors-allowed-origins "http://localhost:3000"
   │  Holds the user's stamps + does the actual chunk upload to Swarm
   ▼
Public Swarm network
   │
   ▼
Public read gateway (https://download.gateway.ethswarm.org/bzz/<hash>/)
   │  Used for shareable URLs + Profile route redirects
   ▼
Anyone on the internet
```

## Hard rules

- ✅ **Use the local Bee at** `http://localhost:1633` for uploads + stamp listing
- ✅ **Bee must be started with** `--cors-allowed-origins "http://localhost:3000"` (or wildcard for dev)
- ✅ Use `bee-js` (`@ethersphere/bee-js` v12.x) — no hand-rolled fetch + custom headers
- ✅ Use `download.gateway.ethswarm.org` for the **read** path (HTML rendering); `api.gateway` redirects HTML to a "forbidden" page
- ❌ Never re-introduce the Beeport-hosted-gateway upload path (custom auth headers, Vite proxy, wallet signature for uploads). That's superseded.
- ❌ Never invoke `/setup-bee` or `/setup-bee-interactive` *as a workaround* — only point the user at them when they need to set up or refund their node.

## Standard upload flow (browser)

```ts
import { Bee } from "@ethersphere/bee-js"

const bee = new Bee(import.meta.env.VITE_BEE_API_URL || "http://localhost:1633")

// List stamps for the dropdown
const batches = await bee.getPostageBatches()
const usable = batches.filter((b) => b.usable)

// Upload a single index.html as a folder/collection
const file = new File([html], "index.html", { type: "text/html" })
const result = await bee.uploadFiles(batchId, [file], {
  indexDocument: "index.html",
  deferred: false,  // wait for network propagation so the public URL works immediately
})

const reference = result.reference.toHex()
// Shareable URL: `${VITE_SWARM_READ_URL}/bzz/${reference}/`
```

## Standard read flow (anyone)

```
Public:    https://download.gateway.ethswarm.org/bzz/<hash>/
ENS-bound: https://<name>.eth.limo/   (after setting contenthash to bzz://<hash>)
Local:     http://localhost:1633/bzz/<hash>/   (only works on the user's machine)
```

## Bee setup (developer-side, before any upload works)

```bash
# Install
curl -s https://raw.githubusercontent.com/ethersphere/bee/master/install.sh | TAG=<latest> sudo bash
npm install -g @ethersphere/swarm-cli

# Run in light mode with CORS open to dev origin
bee start \
  --password <PASSWORD> \
  --swap-enable \
  --api-addr 127.0.0.1:1633 \
  --cors-allowed-origins "http://localhost:3000" \
  --blockchain-rpc-endpoint https://xdai.fairdatasociety.org

# Fund (one-time): ~0.01 xDAI + ~0.2 xBZZ to wallet from `swarm-cli addresses`
# Easiest: https://fund.ethswarm.org

# Buy a stamp
swarm-cli stamp create

# Sanity-check the API
curl -s http://localhost:1633/node | jq
```

When in doubt, route to `/setup-bee-interactive` for the guided walkthrough.

## Cross-reference: when other skills are useful

| Skill | Use for |
|---|---|
| `/setup-bee-interactive` | First-time node install + funding |
| `/setup-bee` | Reference for the install + light-mode flags |
| `/stamps` | Stamp management (top-up, dilute, TTL, depth → capacity) |
| `/upload-download` | Bee-js patterns reference (we already use these) |
| `/feed` | v2 graduation path — mutable feed pointing at latest profile hash |
| `/host-website` | The doc for index/error documents + ENS contenthash flow |
| `/troubleshoot` | Node + upload debugging |
| `/docs` | Conceptual lookups against authoritative Swarm docs |
| `/act`, `/messaging`, `/blog`, `/menu`, `/start`, `/swarm`, `/build-app` | Out of scope for v1 |

## Decision tree for ambiguous requests

```
"Can we add X?"
  ↓
Does X require running infrastructure beyond the user's own Bee?
  ├─ Yes → Out of v1 scope. Surface PRD §8 graduation paths.
  ↓ No
Is X a standard Bee API operation (upload, feed, stamp, contenthash)?
  ├─ Yes → Use bee-js per upload-download / feed / stamps skill. Build it.
  ↓ No
Does X require write access to ENS (contenthash, text records)?
  ├─ Yes → wagmi useWriteContract against the user's resolver. Build it.
  └─ No  → Surface the gap to the user before coding.
```

## Reference

- PRD: `/Users/Gediminas/Desktop/swarmtree/PRD-upload.md`, `/Users/Gediminas/Desktop/swarmtree/PRD.md`
- Bee API: https://docs.ethswarm.org/api/
- bee-js docs: https://bee-js.ethswarm.org/docs/
- Host-your-website guide: https://docs.ethswarm.org/docs/develop/host-your-website/
- Bee install + run: https://docs.ethswarm.org/docs/bee/installation/getting-started/
- swarm-cli: https://github.com/ethersphere/swarm-cli
