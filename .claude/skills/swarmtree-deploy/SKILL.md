---
name: swarmtree-deploy
description: Swarmtree project Swarm workflow — Beeport-first, NO local Bee node. Use for any Swarm-related question in this project: deploying the SPA, reading profile data via public gateway, save-path scope. Overrides the upstream /swarm flow. Always prefer this over /setup-bee, /setup-bee-interactive, or anything assuming http://localhost:1633.
user-invocable: true
---

# Swarmtree — Project Swarm Workflow

This is the project-specific Swarm guide for **Swarmtree**, a Linktree clone on Swarm. It overrides the upstream Swarm skills (which assume a self-hosted Light Bee at `localhost:1633`). The PRD locks v1 to a **Beeport-only, read-first** path.

Source of truth for scope: `/Users/Gediminas/Desktop/swarmtree/PRD.md`.

## Hard rules for this project

These hold for the entire v1 scope. If a task seems to require breaking one of them, surface that to the user before proceeding — it's a scope question, not an implementation question.

- ❌ **Never invoke** `/setup-bee` or `/setup-bee-interactive`
- ❌ **Never** `curl http://localhost:1633/...` or assume a local Bee is reachable
- ❌ **Never** suggest installing Bee, swarm-cli, or buying a postage stamp ourselves
- ❌ **Never** call write-side bee-js (`uploadFile`, `uploadFilesFromDirectory`, `makeFeedWriter`, `createFeedManifest`, `topUpBatch`, `buyStorage`) — they all need a Light Bee we don't have
- ❌ **Never** check or require `--stamp <BATCH_ID>` flags or `batchId` params at runtime
- ✅ **Do** use Beeport for SPA deploy
- ✅ **Do** use bee-js or raw `fetch` against a public Bee gateway for reads
- ✅ **Do** treat the editor's "Save" as a local-only preview that exports JSON to disk

## How we deploy the app (one-time per release)

```
1. npm run build            → produces dist/
2. Open https://beeport.ethswarm.org
3. Drag dist/ into the Beeport upload UI (or use its file picker)
4. Wait for upload — Beeport handles its own stamp
5. Copy the returned manifest hash (looks like 0x... or a 64-char hex)
6. Test the deploy:
   https://api.gateway.ethswarm.org/bzz/<MANIFEST_HASH>/
7. (Optional, recommended) Update swarmtree.eth contenthash on
   https://app.ens.domains  →  set to bzz://<MANIFEST_HASH>
8. Verify ENS resolution:
   https://swarmtree.eth.limo
```

Each redeploy = new manifest hash + one ENS contenthash update tx (~$1–3 in mainnet ETH gas). Plan for at most 1–2 deploys during the hackathon.

Document each deploy's hash + date in a `DEPLOYS.md` log so we can roll back to a previous Beeport hash without redeploying.

## How we read profile data at runtime

Pure HTTP GET against a public gateway. No bee-js auth, no batch ID, no local node.

### Recommended pattern (bee-js)

```ts
import { Bee } from '@ethersphere/bee-js'

const bee = new Bee(import.meta.env.VITE_BEE_GATEWAY_URL)

export async function loadProfile(profileHash: string) {
  const file = await bee.downloadFile(profileHash, 'profile.json')
  return JSON.parse(file.data.toUtf8())
}
```

### Even simpler (raw fetch — fewer deps)

```ts
const GATEWAYS = [
  'https://api.gateway.ethswarm.org',
  'https://download.gateway.ethswarm.org',
]

export async function loadProfile(hash: string) {
  for (const gw of GATEWAYS) {
    try {
      const r = await fetch(`${gw}/bzz/${hash}/profile.json`)
      if (r.ok) return await r.json()
    } catch { /* try next */ }
  }
  throw new Error('All gateways failed')
}
```

The fallback list matters: gateways do go down. Day-of-demo mitigation per PRD §9.

### ENS-name access (no app code needed)

Anyone can hit `https://<name>.eth.limo/` or `https://<name>.bzz.link/` to load Swarm content registered to that ENS name's `contenthash`. We don't write code for this — it's free infra.

## What about writes?

**v1 does not write to Swarm.** The editor (PRD §6.6) is preview-only and exports JSON to disk on "save." Anywhere a save would happen, the UI must show a "Preview Only" badge per PRD §6.7.

If a feature request implies a write (real persistence, profile updates surviving page reload, etc.), it's a **v2 graduation path**, not a v1 task. Three v2 options live in PRD §12; pick one explicitly before writing code.

## Cross-reference: when upstream skills are useful

The 14 upstream skills sitting next to this one assume a self-hosted Bee. Most are unusable as-is, but some have reusable parts:

| Skill | Use as | Skip |
|---|---|---|
| `/docs` | Conceptual lookups against authoritative Swarm docs — fully useful | — |
| `/troubleshoot` | Read-path debugging (gateway 4xx/5xx, manifest issues) | The "node not running" branches |
| `/upload-download` | Reference for the read-side bee-js API | Every section that uses `batchId` or `localhost:1633` |
| `/host-website` | The Beeport fallback note + the ENS contenthash steps | The swarm-cli and bee-js localhost flows |
| `/feed`, `/stamps` | v2 planning reference only | All command examples (they assume localhost) |
| `/setup-bee`, `/setup-bee-interactive` | Never in v1 | Everything |
| `/act`, `/messaging`, `/blog`, `/menu`, `/start`, `/swarm`, `/build-app` | Out of v1 scope | Everything |

## Decision tree for ambiguous requests

```
"Can we add X?"
  ↓
Does X require writing to Swarm at runtime?
  ├─ Yes → It's a v2 task. Surface the three graduation paths from PRD §12.
  ↓ No
Does X require running a Bee node?
  ├─ Yes → Same: v2 task. Default answer is no for v1.
  ↓ No
Does X work with public-gateway reads + the seeded directory.json?
  ├─ Yes → It's in v1 scope. Build it.
  └─ No  → Surface the gap to the user before coding.
```

## Reference

- PRD: `/Users/Gediminas/Desktop/swarmtree/PRD.md`
- Beeport: https://beeport.ethswarm.org
- Public gateway: https://api.gateway.ethswarm.org
- Swarm docs: https://docs.ethswarm.org
- bee-js docs: https://bee-js.ethswarm.org/docs/
- Upstream skills source (re-clone if needed): https://github.com/ethersphere/swarm-quickstart-skills
