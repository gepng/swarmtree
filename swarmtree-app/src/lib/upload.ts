export interface UploadResult {
  reference: string
  bzzUrl: string
}

export interface UploadParams {
  html: string
  batchId: string
  uploadUrl: string
  readUrl: string
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

// Posts a single index.html as a Swarm collection directly to the public Swarm
// gateway. The gateway's underlying Bee node accepts uploads against any batch
// ID it has seen — no wallet signature or proxy required (CORS is wildcarded).
// Reads of the resulting HTML happen via download.gateway.ethswarm.org because
// api.gateway redirects HTML uploads to a "forbidden" page (phishing protection).
export async function uploadProfileFolder(
  p: UploadParams
): Promise<UploadResult> {
  const batchId = normalizeBatchId(p.batchId)

  const formData = new FormData()
  formData.append(
    "file",
    new Blob([p.html], { type: "text/html" }),
    "index.html"
  )

  const res = await fetch(`${p.uploadUrl.replace(/\/$/, "")}/bzz`, {
    method: "POST",
    headers: {
      "swarm-postage-batch-id": batchId,
      "swarm-collection": "true",
      "swarm-index-document": "index.html",
      // Wait for chunks to propagate so the hash is immediately resolvable.
      "swarm-deferred-upload": "false",
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `Upload failed (${res.status} ${res.statusText})${body ? `: ${body}` : ""}`
    )
  }

  const data = (await res.json()) as { reference?: string }
  if (!data.reference) {
    throw new Error("Upload succeeded but response had no reference field")
  }

  const readBase = p.readUrl.replace(/\/$/, "")
  return {
    reference: data.reference,
    bzzUrl: `${readBase}/bzz/${data.reference}/`,
  }
}
