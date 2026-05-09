// Wallet-address (lowercase, 0x-prefixed) → Swarm hash of `profile.json`.
// This is the v1 "fake database" — replaces with real feeds in v2 graduation.
//
// To populate after a Beeport upload:
//   1. Upload your profile.json folder to https://beeport.ethswarm.org
//   2. Copy the manifest hash from the result
//   3. Add an entry below: '0xyourwallet': '<manifest-hash>'
//   4. Rebuild + redeploy
export const directory: Record<string, string> = {
  // '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': '<swarm-hash>',
}

export function lookupProfileHash(address: string): string | null {
  return directory[address.toLowerCase()] ?? null
}

export function getGateway(): string {
  return (
    import.meta.env.VITE_BEE_GATEWAY_URL || "https://api.gateway.ethswarm.org"
  )
}
