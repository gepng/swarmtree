import { Bee } from "@ethersphere/bee-js"

export interface UploadResult {
  reference: string
  bzzUrl: string
  localBzzUrl: string
}

export interface UploadParams {
  html: string
  batchId: string
  beeUrl: string
  publicGatewayUrl: string
}

const HEX_64 = /^[0-9a-fA-F]{64}$/

function normalizeBatchId(input: string): string {
  const stripped = input.startsWith("0x") ? input.slice(2) : input
  if (!HEX_64.test(stripped)) {
    throw new Error(
      "Invalid batch ID — expected 64-character hex (with or without 0x prefix)"
    )
  }
  return stripped
}

// Uploads a single index.html as a Swarm collection through the user's local
// Bee light node (default http://localhost:1633). Returns both the public
// gateway URL (shareable) and the local Bee URL (instant verify on the user's
// machine, only works while their Bee is running).
//
// Bee CORS requirement: the node must be started with
//   bee start --cors-allowed-origins "http://localhost:3000"
// otherwise the browser fetch is blocked.
export async function uploadProfileFolder(
  p: UploadParams
): Promise<UploadResult> {
  const batchId = normalizeBatchId(p.batchId)

  const bee = new Bee(p.beeUrl)
  const file = new File([p.html], "index.html", { type: "text/html" })

  const result = await bee.uploadFiles(batchId, [file], {
    indexDocument: "index.html",
    // Wait for chunks to propagate so the public-gateway URL works immediately.
    deferred: false,
  })

  const reference = result.reference.toHex()
  const beeBase = p.beeUrl.replace(/\/$/, "")
  const gwBase = p.publicGatewayUrl.replace(/\/$/, "")

  return {
    reference,
    bzzUrl: `${gwBase}/bzz/${reference}/`,
    localBzzUrl: `${beeBase}/bzz/${reference}/`,
  }
}
