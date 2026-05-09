import { Bee } from "@ethersphere/bee-js"

import type { Profile } from "@/lib/profile"
import { getGateway } from "@/lib/directory"

const FALLBACK_GATEWAYS = [
  "https://download.gateway.ethswarm.org",
]

function gatewaysToTry(): string[] {
  const primary = getGateway()
  return [primary, ...FALLBACK_GATEWAYS.filter((g) => g !== primary)]
}

export async function loadProfile(hash: string): Promise<Profile> {
  let lastError: unknown = null
  for (const gateway of gatewaysToTry()) {
    try {
      const bee = new Bee(gateway)
      const file = await bee.downloadFile(hash, "profile.json")
      return JSON.parse(file.data.toUtf8()) as Profile
    } catch (e) {
      lastError = e
    }
  }
  throw new Error(
    `Failed to load profile from any gateway: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  )
}

export function bzzUrl(hash: string, path = ""): string {
  const gw = getGateway().replace(/\/$/, "")
  return `${gw}/bzz/${hash}/${path}`.replace(/\/$/, "")
}
