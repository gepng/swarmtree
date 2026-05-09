# Swarmtree — PRD (Hackathon MVP)

A Linktree clone where every profile page is hosted on Swarm and identified by an Ethereum wallet. Built as a read-first MVP: real Swarm reads, real ENS resolution, real wallet identity, *seeded* profile content. The save path is mocked locally for the hackathon and graduates to real writes post-event.

---

## 1. Vision

Linktree, but you don't have an account on linktree.com — your **wallet is your account**, your **profile lives on Swarm**, and your **bzz.link / eth.limo URL is your homepage**. The app itself is also hosted on Swarm: there is no central server in the demo path.

The pitch in one sentence: *"Your links page, hash-addressed, wallet-owned, no servers."*

## 2. Why this scope (the read-only bet)

Swarm has a sharp asymmetry: **reads are free and serverless via public gateways; writes require a Light Bee node somewhere**. A hackathon MVP that demos real writes either runs infrastructure (a Bee + funded stamp) or asks judges to bridge BZZ to Gnosis Chain — both kill the demo.

By choosing a read-first scope, we get to demo the genuinely interesting parts (content addressing, ENS resolution, wallet identity, decentralized hosting) using only public infrastructure. The save flow is honestly labeled "preview mode" in v1 and is a 1-day add-on for v2 once we pick a write path.

## 3. Target users

- **Primary:** Hackathon judges evaluating a 3-minute demo. They want to see something that visibly works on real decentralized infra, not a slideware.
- **Secondary:** Crypto-native users who already have an ENS name and want a Linktree-equivalent that doesn't trust a SaaS company.
- **Tertiary (post-hackathon):** Anyone with a wallet, ENS-or-not.

## 4. Goals and non-goals

### Goals (in scope for MVP)
- A live, public URL on Swarm (via Beeport) that loads the app
- Wallet connect (MetaMask + WalletConnect) for identity display
- View any user's profile by ETH address or ENS name
- 3–5 pre-seeded sample profiles uploaded to Swarm and linked from the UI
- Profile content fetched live from a public Swarm gateway every page load
- ENS resolution: typing `alice.eth` resolves to a wallet → fetches that wallet's profile
- An "edit profile" UI that works locally and visibly previews changes — no persistence
- Honest UX labeling: a "Preview only" badge anywhere mocked saves appear

### Non-goals (explicitly deferred)
- Real persistent profile saves (no Bee writes, no feed updates, no on-chain writes)
- User-supplied stamps, postage purchase flows, or any BZZ handling
- Account creation flows for non-wallet users
- Profile analytics, click tracking, theming, custom domains
- Mobile-native apps
- Image uploads (avatars are external URLs only in v1)
- Search / discovery beyond the 3–5 seeded examples
- Auth beyond wallet signature (and we don't even need signatures in v1)

## 5. User stories

| # | As a... | I want to... | So that... |
|---|---------|--------------|------------|
| 1 | Visitor | Go to `swarmtree.eth.limo` | I land on the app served from Swarm |
| 2 | Visitor | Browse the seeded example profiles | I can see what a Swarmtree profile looks like |
| 3 | Visitor | Type any ETH address or ENS name in a search box | I can view that user's profile if it exists |
| 4 | Wallet user | Connect my wallet | The app shows my address and looks up my profile |
| 5 | Wallet user with no profile | See a "claim your handle" empty state | I understand the product proposition |
| 6 | Wallet user | Open the editor and arrange links + bio | I can preview what my Swarmtree would look like |
| 7 | Wallet user | Click "Save" | I see a clearly-labeled "preview only — saves coming soon" message |
| 8 | Anyone | Share a link like `swarmtree.eth.limo/#/u/alice.eth` | The recipient sees alice's profile rendered from Swarm |

## 6. Functional requirements

### 6.1 App routing (hash-based)

Hash routing keeps deep links working on a static Swarm host without depending on Bee path rewrites.

- `/#/` — landing page; sample profiles, "Connect Wallet" CTA, search bar
- `/#/u/<eth-address-or-ens>` — public profile view
- `/#/me` — connected wallet's profile, or empty state if none
- `/#/edit` — local editor (preview only)
- `/#/about` — what is Swarmtree, how it works (with the honest "preview only" disclosure)

### 6.2 Profile data shape

A profile is a single JSON file uploaded to Swarm. Read by hash; mapping from wallet → hash is hardcoded in v1 (see §6.4).

```json
{
  "version": 1,
  "address": "0xabc...",
  "ens": "alice.eth",
  "displayName": "Alice",
  "bio": "Builder. Coffee. Long walks on Gnosis Chain.",
  "avatarUrl": "https://...",
  "theme": "default",
  "links": [
    { "label": "Twitter", "url": "https://twitter.com/alice", "icon": "twitter" },
    { "label": "GitHub",  "url": "https://github.com/alice",   "icon": "github" }
  ],
  "updatedAt": "2026-05-09T12:00:00Z"
}
```

Schema is forward-compatible via the `version` field. Renderer ignores unknown fields.

### 6.3 Profile resolution flow

```
input: "alice.eth" or "0xabc..."
  ↓
if ENS → resolve to address via viem (read-only RPC, public)
  ↓
look up address in directory.json (seeded mapping; see §6.4)
  ↓
if found → fetch https://<gateway>/bzz/<profile-hash>/profile.json
  ↓
render
  ↓ (if any step fails)
empty state: "No Swarmtree found for this address — be the first?"
```

### 6.4 Seeded directory

A static `directory.json` shipped with the app, pinned alongside the bundle:

```json
{
  "0xabc...": "<swarm-hash-1>",
  "0xdef...": "<swarm-hash-2>",
  "alice.eth": "0xabc..."
}
```

This is the "fake database" that lets us demo lookups without a real backend. It freezes at deploy time. v2 replaces this with feed-based or ENS-text-record-based resolution.

### 6.5 Wallet connect

- Library: `wagmi` + `viem` + WalletConnect v2 connector
- Required only for identity display and `/#/me` routing
- **No transactions, no signatures** in v1
- Public RPC is fine (LlamaRPC or a public Gnosis RPC); no Alchemy key needed

### 6.6 Editor (preview-only)

- Loads current profile (or blank template) into a form
- Lets the user reorder, add, remove, edit links and bio
- Live preview pane shows the resulting profile card
- "Save" button shows a toast: `Preview only — real saves shipping in v2. Copy your draft as JSON ↓` with a button that downloads the JSON to disk
- This is the honest, demoable mock — judges see real UI, real preview, and the export hatch makes it feel like real ownership without lying

### 6.7 Honest labeling

A `Preview Only` badge must appear:
- In the editor header
- On the Save button
- In the success toast after "save"

The /about page explains plainly: "Saves are coming. Today, the app reads from Swarm live. Profile changes preview locally and export as JSON."

This matters. Hackathon judges respect honest scope more than they punish small scope.

## 7. Technical architecture

### 7.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vite + React + TypeScript** | Static output, fastest dev loop, no SSR foot-guns on Swarm |
| Routing | `react-router-dom` with `HashRouter` | Hash routing avoids Bee path-rewrite questions |
| Styling | Tailwind + a few hand-rolled components | Quick, hackathon-grade visual polish |
| Wallet | `wagmi` + `viem` + WalletConnect v2 | Standard, public RPC compatible |
| Swarm reads | `@ethersphere/bee-js` pointed at a public gateway | One library, official, mature |
| Hosting | **Beeport (beeport.ethswarm.org)** | The official no-node deploy path |
| Domain | ENS contenthash → Beeport manifest hash | Optional but enables `swarmtree.eth.limo` |

### 7.2 Read path

```
Browser → bee-js.downloadFile(hash)
        → HTTPS GET https://api.gateway.ethswarm.org/bzz/<hash>/profile.json
        → JSON returned → React renders
```

Public gateway candidates (verify which is healthiest day-of):
- `https://api.gateway.ethswarm.org/`
- `https://download.gateway.ethswarm.org/`
- `https://eth.limo/` and `https://bzz.link/` for ENS-resolved access

### 7.3 Build & deploy

1. `vite build` → produces `dist/`
2. Drag `dist/` into Beeport UI (manual, one-time per release)
3. Beeport returns a manifest hash
4. Update `swarmtree.eth` ENS contenthash to point at that manifest hash (one-time, then ENS auto-resolves to whatever the latest deploy is — no, actually, it doesn't. Each deploy is a new hash; updating ENS is a tx. Document this.)

Trade-off worth flagging: each redeploy costs an ENS update tx (~$1–3 in ETH gas on mainnet). For a hackathon we deploy once or twice; this is fine.

### 7.4 Environment variables

Following the public-bundle rule:

| Var | Where | Notes |
|---|---|---|
| `VITE_BEE_GATEWAY_URL` | client | Public, fine in bundle |
| `VITE_WALLETCONNECT_PROJECT_ID` | client | Public-by-design |
| `VITE_GNOSIS_RPC_URL` | client | Public RPC; no key |
| `VITE_DEFAULT_PROFILE_HASHES` | client | Map of seeded hashes baked at build |

No build-time secrets needed for v1 — there is no relay, no deployer key, no postage batch ID. Beeport handles its own stamp.

### 7.5 Pre-seeding workflow (one-time before demo)

1. Author 3–5 sample profile JSON files locally (`profiles/alice.json`, etc.)
2. Upload each via Beeport → record the returned hash
3. Update `src/directory.json` with the wallet → hash mapping
4. Rebuild and redeploy

Document this in `SEEDING.md` so a teammate can repeat it.

## 8. Demo script (3 minutes)

| Time | Action | What judges see |
|---|---|---|
| 0:00 | Open `swarmtree.eth.limo` | App loads from Swarm. Show that there's no `.com` domain. |
| 0:15 | Click "alice.eth" sample card | Profile renders. Open devtools Network tab — show the `bzz` request. |
| 0:35 | Type `vitalik.eth` in search bar | ENS resolves; show "no profile found" empty state. Honest. |
| 0:55 | Connect MetaMask | Wallet address appears top-right. |
| 1:10 | Navigate to `/#/me` | Empty state with "create your Swarmtree" CTA. |
| 1:20 | Open editor, drag a few links, edit bio | Live preview updates. |
| 1:50 | Click Save | "Preview only" toast appears. Click "export as JSON" to download. |
| 2:10 | Open the downloaded JSON in a text editor | Show that the user owns this content fully — it's just a file. |
| 2:25 | Talk through the architecture slide | Beeport → Swarm hash → ENS contenthash → eth.limo gateway. No servers. |
| 2:50 | Roadmap: feeds, real saves, ENS subnames | "Today reads are real, writes are next." |

## 9. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Beeport down or rate-limiting on demo day | Low–Medium | Pre-deploy 24h ahead; keep manifest hash + bzz.link URL as backup share link |
| Public Swarm gateway slow/down | Medium | Code in fallback list of 2–3 gateways; retry with each |
| ENS resolution fails on a public RPC | Low | Hardcode a 2nd RPC fallback; the seeded profiles work without ENS anyway |
| WalletConnect project quota | Very low | Free tier handles hackathon traffic |
| Judges feel "preview only" is a cop-out | Medium | Address it head-on in /about and in the demo: "We chose to ship one path real instead of two paths fake" |
| ENS contenthash doesn't propagate in time | Low | Demo can fall back to direct `https://api.gateway.ethswarm.org/bzz/<hash>/` URL — same content |

## 10. Open questions

- [ ] Which public Swarm gateway should be primary? (Recommend `api.gateway.ethswarm.org`, verify uptime closer to demo)
- [ ] Do we want `swarmtree.eth` or a different ENS name? (Need to register / borrow one with mainnet ETH)
- [ ] Tailwind + shadcn/ui, or roll plain CSS? (Recommend shadcn for speed)
- [ ] Do we add a "view source on Swarm" link that opens the raw `bzz` URL for the current profile? (Cheap credibility win — recommend yes)
- [ ] Sample profile personas: real teammates, fictional, or famous ENS names with permission?

## 11. Success criteria

The MVP is "demo-ready" when:

- [ ] The app loads from a Swarm hash via at least one public gateway
- [ ] An ENS-mapped URL (`*.eth.limo`) resolves to the deployed app
- [ ] At least 3 seeded profiles render correctly from live Swarm fetches
- [ ] Wallet connect works on MetaMask and one mobile wallet via WalletConnect
- [ ] ENS name lookup in the search bar works for a known address
- [ ] Editor shows live preview and "Preview Only" labeling is unambiguous
- [ ] The 3-minute demo script can run end-to-end without manual recovery

If all seven hold, we ship.

## 12. Post-MVP (graduation paths)

Pick one based on what we learn from judge feedback:

1. **Feeds + managed Bee** — rent an Etherna/SolarPunk Bee endpoint, hold one shared stamp, real saves via a tiny Vercel relay. ~1 day of work. Most "real product" feel.
2. **ENS text record saves** — profile JSON inlined as a text record on the user's ENS name. No Bee writes; users pay gas. ~½ day. Fully decentralized; gates on user owning ENS.
3. **Per-user feeds via wallet-derived keys** — derive a deterministic feed key from a wallet signature, write feeds via a managed Bee. Closest to the "wallet-owned mutable site" vision but most subtle. ~2 days.

Each is additive — they don't invalidate v1. v1's read path is the foundation all three build on.
