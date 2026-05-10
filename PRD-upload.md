# Swarmtree — Programmatic Upload (PRD addendum, v2)

**Architectural pivot (2026-05-10):** v1 of this PRD piggybacked on Beeport's hosted gateway. We've moved to running our own **local Bee light node**, which is the documented, supported path and removes our dependency on Beeport's infrastructure.

This addendum describes the live shape; supersedes everything in v1 about gateways, custom auth headers, and CORS proxies.

## 1. Goal (unchanged)

User clicks **Save & upload** in the editor → ~5 seconds later sees their live `bzz://<hash>` URL, with the page rendered and shareable.

## 2. Why local Bee

- **Documented**: matches `https://docs.ethswarm.org/docs/develop/host-your-website/` exactly. No reverse engineering.
- **Reliable**: no dependence on a third-party hosted Bee whose CORS, API shape, or uptime can change.
- **Real ownership**: stamps you buy belong to your wallet on Gnosis Chain and live on a Bee you control.
- **Same Bee handles reads + writes**: instant verification at `localhost:1633/bzz/<hash>/` even before public-gateway propagation.
- **Drops a lot of code**: no wallet signature for upload, no proxy backend, no custom Beeport auth headers.

Trade-off: developer friction (install Bee, fund with xBZZ + xDAI, run swap mode). Worth it for a project that's at all serious about Swarm.

## 3. Bee setup (developer prerequisite)

```bash
# Install (latest tag from https://github.com/ethersphere/bee/releases/latest)
curl -s https://raw.githubusercontent.com/ethersphere/bee/master/install.sh | TAG=<TAG> sudo bash

# Install swarm-cli for stamp management
npm install -g @ethersphere/swarm-cli

# Run in light mode with CORS open to the dev origin
bee start \
  --password <PASSWORD> \
  --swap-enable \
  --api-addr 127.0.0.1:1633 \
  --cors-allowed-origins "http://localhost:3000" \
  --blockchain-rpc-endpoint https://xdai.fairdatasociety.org

# Wait until `swarm-cli status` shows Δ < 10 blocks (light-node sync)

# Buy a stamp (interactive — picks capacity + TTL)
swarm-cli stamp create
```

Funding the node: ~0.01 xDAI + ~0.2 xBZZ to the wallet shown by `swarm-cli addresses` on Gnosis Chain (use https://fund.ethswarm.org for one-step multichain top-up). Full setup walkthrough lives in the project's `setup-bee` skill.

For production / shipped app: deploy a Bee node on a small VPS with the SPA's deployed origin in `--cors-allowed-origins`, OR have each user run their own node and configure `VITE_BEE_API_URL` to point at it.

## 4. Code architecture

```
src/lib/upload.ts            — uploadProfileFolder({ html, batchId, beeUrl, publicGatewayUrl })
                                Uses bee-js: bee.uploadFiles(batchId, [file],
                                { indexDocument: "index.html", deferred: false })
                                Returns { reference, bzzUrl, localBzzUrl }

src/hooks/useStamp.ts        — useStamps(beeUrl): returns { stamps, loading, error,
                                selectedId, setSelectedId, refetch }
                                Calls bee.getPostageBatches() to populate dropdown.
                                Persists chosen batch in localStorage.

src/lib/swarm.ts             — bzzUrl(hash): builds public-gateway URL for sharing
src/lib/directory.ts         — saveProfileHash, lookupProfileHash, getGateway
                                (defaults to download.gateway.ethswarm.org)

src/pages/Dashboard.tsx      — Stamp settings card now shows a live dropdown
                                of usable stamps from the local Bee, with
                                loading / error / empty states. No more paste box.

.env.example                 — VITE_BEE_API_URL=http://localhost:1633
                                VITE_SWARM_READ_URL=https://download.gateway.ethswarm.org
```

## 5. Two URLs per upload

`uploadProfileFolder` returns both:

- **`bzzUrl`** — public gateway (`download.gateway.ethswarm.org/bzz/<hash>/`). Shareable. Works after chunks propagate (we use `deferred: false` so this is immediate). This is what we display + put in `directory.ts` for `/u/:identifier` redirects.
- **`localBzzUrl`** — local Bee (`localhost:1633/bzz/<hash>/`). Only works on the user's machine while their Bee is running. Useful for instant verification during dev. Currently unused in the UI; available for future "verify locally" affordance.

## 6. Stamp UX

The Stamp settings card renders one of four states:

| State | Trigger | UI |
|---|---|---|
| Loading | Initial fetch | Spinner + "Loading stamps from your Bee…" |
| Error | Bee unreachable / CORS rejected | Red error + the message + reminder about `--cors-allowed-origins` |
| Empty | Bee reachable, zero usable stamps | Hint: `swarm-cli stamp create` |
| Stamps | ≥1 usable stamp | `<select>` dropdown with label + usage% + depth + first-10-chars of batch ID |

Refresh button (`RefreshCw` icon) re-runs `getPostageBatches()` without a full page reload.

## 7. What's gone (good riddance)

- Vite proxy (`/api/swarm` → beeport.ethswarm.org)
- Wallet signature for upload (`useSignMessage`)
- Custom Beeport auth headers (`x-uploader-address`, `x-upload-signed-message`, `x-message-content`, `x-file-name`)
- `swarming.site` and `api.gateway.ethswarm.org/bzz` upload endpoints
- The whole CORS / "must dev on port 3000 to be in Beeport's allowlist" saga
  (well, dev still runs on 3000, but only because it's in our local Bee's CORS flag)

## 8. What's still next (graduation paths)

- **ENS contenthash setter**: one-click button that sets the user's ENS name's contenthash to `bzz://<hash>` so their page lives at `<name>.eth.limo`. Needs viem `useWriteContract` against the user's ENS resolver + multicodec encoding for the contenthash bytes.
- **Programmatic stamp purchase**: replace the "run `swarm-cli stamp create`" instruction with a button calling `bee.buyStorage(size, duration)`. Needs xBZZ in the Bee wallet; user-friendly when funding flow is solid.
- **Feed-based mutability**: `bee.makeFeedWriter(topic, key).uploadReference(batchId, hash)` so the user gets a stable URL whose content updates without ENS gas. Pairs with ENS contenthash pointing at the feed manifest.

## 9. Demo flow

```
prereq:   Bee node running with CORS open + at least 1 usable stamp

1.        Visit http://localhost:3000
2.        Connect wallet
3.        Stamp dropdown auto-populates from your Bee
4.        Fill profile + (optional) verify ENS
5.        Click Save & upload     →  bee.uploadFiles(...)
6.        ~5s later                →  hash + public-gateway URL appear
7.        Click /u/<address>       →  SPA redirects to public bzz URL
8.        Set ENS contenthash      →  page lives at <name>.eth.limo
```

No popups. No proxy. No third-party gateway dependency for the write path.
