# Swarmtree — Programmatic Upload (PRD addendum)

Replaces the manual "Save & download → drag into Beeport" flow with a one-click in-app upload that produces a Swarm hash and a live bzz URL. Companion to `PRD.md`; do not re-state the v1 architecture, only the new upload feature.

## 1. Goal

User clicks **Save & upload** in the editor → 5 seconds later sees their live `bzz://<hash>` URL, with the page rendered and shareable. Zero file downloads. Zero context switches to Beeport's UI.

## 2. Why this is reachable without our own Bee node

Beeport (open-source) consists of a Next.js frontend + an Express proxy + a Bee node, all run by the Swarm Foundation at `beeport.ethswarm.org` (frontend) and `swarming.site` (backend).

Their backend exposes `POST /bzz` with a wallet-signature auth scheme:
- Verifies the wallet signed `${fileName}:${batchId}`
- Verifies via on-chain registry (`0x5EBfBeFB1E88391eFb022d5d33302f50a46bF4f3` on Gnosis) that the wallet paid for that batch
- Proxies authorized uploads to their own Bee node

We piggyback on this: we already have wallet connect (wagmi) and we can hit their public backend with the right headers from a CORS-allowed origin. The user's batch (already purchased earlier via the Beeport UI) authorizes uploads.

## 3. Scope

### In v1 of the upload feature
- **Stamp settings**: text input for the user's batch ID, persisted to `localStorage` so they paste once
- **Save & upload button**: alongside the existing Save & download (which stays as a fallback)
- **Upload pipeline**: wallet sign → multipart POST → display returned hash + bzz URL
- **Inline result card**: copy-button for hash, link to `bzz://<hash>/`, "Copy directory entry" snippet to paste into `directory.ts`
- **Dev port = 3000**: Vite runs on `localhost:3000` so Beeport's CORS allowlist accepts our origin (default 5173 is not in their list)

### Explicitly out of scope (deferred)
- Buying stamps from inside our SPA — user keeps using Beeport's UI for that one-time setup
- Auto-discovery of the user's batches by reading registry events — manual paste is fine for v1; nice-to-have for v2
- Production deployment behind `swarmtree.eth.limo` — Beeport's CORS will reject it. Mitigations live in §6
- Running our own backend proxy
- Tar-archive uploads — multipart/form-data is enough for our single-file folder

## 4. Technical approach

### 4.1 Upload request shape

```
POST https://swarming.site/bzz
Headers:
  swarm-postage-batch-id: <user's batch ID>
  swarm-collection: true
  swarm-index-document: index.html
  x-uploader-address: <connected wallet, lowercase 0x...>
  x-upload-signed-message: <wallet signature of `index.html:<batchId>`>
  x-message-content: index.html:<batchId>
  x-file-name: index.html
Body: multipart/form-data with one part
  name="file" filename="index.html" type="text/html"
  body: generated HTML string
```

Browser sets `Content-Type: multipart/form-data; boundary=...` automatically when we use `FormData`.

Returned 201 with JSON `{ reference: "<64-char hex>" }`. That's the manifest hash for the folder containing `index.html`.

### 4.2 Files

```
src/lib/upload.ts          ← uploadProfileFolder(html, batchId, address, signMsg) → hash
src/hooks/useStamp.ts      ← localStorage-backed batch ID hook (get/set/clear)
src/pages/Dashboard.tsx    ← stamp settings card + Save & upload button + result card
package.json               ← "dev": "vite --port 3000 --strictPort"
.env.example               ← VITE_BEEPORT_BACKEND_URL=https://swarming.site
src/lib/wagmi.ts (no change) — useSignMessage works with existing wallet config
```

### 4.3 UX state machine for the upload button

```
idle → click → signing (wallet popup) → uploading (spinner) → success (show hash + URL)
                                                            → error (show message, retry)
```

If no `batchId` set: button is disabled with hint "Add your Beeport batch ID first." Stamp settings card is always above the form.

### 4.4 What we don't import

No bee-js. We just removed it and the upload is one `fetch` call — no need to re-add ~70 KB of SDK.

## 5. Success criteria

- [ ] User pastes batch ID once → persisted across reloads
- [ ] Clicking Save & upload triggers exactly one wallet signature prompt
- [ ] On success the hash appears within 10 seconds of clicking
- [ ] The displayed `bzz://<hash>/` URL loads the standalone Linktree page in a new tab
- [ ] After upload, user sees a one-line code snippet they can paste into `directory.ts`
- [ ] All of the above works on `http://localhost:3000` (CORS-allowed origin)

If those six pass, the feature is done.

## 6. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Beeport changes their auth headers or shuts down `swarming.site` | High but rare | We pin the auth shape; if it breaks the Save & download fallback still works |
| CORS rejects our prod origin (`swarmtree.eth.limo`) | Certain at deploy time | For demo: deploy our SPA via Beeport itself (`*.eth.limo` is not in their allowlist either, but `beeport.eth.limo` is — we'd need them to add our domain, OR demo from `localhost:3000`, OR run a tiny proxy of their backend on a domain we add to the allowlist of OUR proxy) |
| Wallet signature UX feels heavy ("sign every save") | Medium | Beeport's backend supports session tokens (`x-multi-file-upload`) — defer to v2 if it's annoying |
| Batch expires mid-demo | Low | Show stamp expiry warning if we can read batch TTL; fallback: user re-buys via Beeport |
| User has no batch yet | High at first run | Stamp settings card has a "Get one at Beeport ↗" link |

## 7. Open questions (non-blocking)

- Do we want to detect the user's batches automatically by watching the registry contract for `BatchPaid(payer)` events? Adds polish but not required for v1
- Should success state offer to set ENS contenthash automatically (one tx)? Out of scope for this addendum but a strong v2 follow-up — closes the loop on "your wallet is your homepage"

## 8. Demo flow once shipped

1. Connect wallet
2. Paste batch ID into Stamp settings (one-time)
3. Fill in profile, attach ENS
4. Click **Save & upload**
5. MetaMask popup → sign
6. ~5 seconds later → success card with `https://api.gateway.ethswarm.org/bzz/<hash>/` link
7. Click the link → standalone Linktree page renders, served from Swarm
8. Copy the directory snippet, paste into `directory.ts`, refresh app, `/u/your.eth` redirects to your bzz URL
