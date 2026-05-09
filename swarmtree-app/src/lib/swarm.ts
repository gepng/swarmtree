import { getGateway } from "@/lib/directory"

export function bzzUrl(hash: string, path = ""): string {
  const gw = getGateway().replace(/\/$/, "")
  return `${gw}/bzz/${hash}/${path}`.replace(/\/$/, "")
}
