import type { Hex } from "viem"

export interface UploadResult {
  reference: string
  bzzUrl: string
}

export interface UploadParams {
  html: string
  batchId: string
  address: string
  backendUrl: string
  gatewayUrl: string
  signMessageAsync: (args: { message: string }) => Promise<Hex>
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

// Posts a single index.html as a Swarm collection through Beeport's open-source
// proxy (default https://swarming.site). The user's wallet signs `index.html:<batchId>`
// to prove they paid for the batch on the registry contract on Gnosis Chain.
export async function uploadProfileFolder(
  p: UploadParams
): Promise<UploadResult> {
  const batchId = normalizeBatchId(p.batchId)
  const fileName = "index.html"
  const messageContent = `${fileName}:${batchId}`

  const signature = await p.signMessageAsync({ message: messageContent })

  const formData = new FormData()
  formData.append(
    "file",
    new Blob([p.html], { type: "text/html" }),
    fileName
  )

  const res = await fetch(`${p.backendUrl.replace(/\/$/, "")}/bzz`, {
    method: "POST",
    headers: {
      "swarm-postage-batch-id": batchId,
      "swarm-collection": "true",
      "swarm-index-document": "index.html",
      "x-uploader-address": p.address,
      "x-upload-signed-message": signature,
      "x-message-content": messageContent,
      "x-file-name": fileName,
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

  const gateway = p.gatewayUrl.replace(/\/$/, "")
  return {
    reference: data.reference,
    bzzUrl: `${gateway}/bzz/${data.reference}/`,
  }
}
