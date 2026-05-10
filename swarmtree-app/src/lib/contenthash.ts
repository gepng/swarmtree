import type { Hex } from "viem"

const HEX_64 = /^[0-9a-fA-F]{64}$/

// EIP-1577 / ENSIP-7 contenthash bytes for a Swarm reference.
//
// Layout (39 bytes total):
//   e4 01     varint of swarm-ns multicodec (0xe4)
//   01        CID version 1
//   fa 01     varint of swarm-manifest codec (0xfa)
//   1b        keccak-256 multihash function code
//   20        digest length = 32 bytes
//   <hash>    the 32-byte Swarm reference
//
// String form: 0xe40101fa011b20<64-char hash>
export function encodeBzzContenthash(hash: string): Hex {
  const stripped = hash.startsWith("0x") ? hash.slice(2) : hash
  if (!HEX_64.test(stripped)) {
    throw new Error(
      "Invalid Swarm hash — expected 64 hex chars (with or without 0x prefix)"
    )
  }
  return `0xe40101fa011b20${stripped.toLowerCase()}` as Hex
}

// Inverse of encodeBzzContenthash. Returns null for non-Swarm contenthashes
// (ipfs, ipns, etc.) so callers can render them differently.
export function decodeBzzContenthash(contenthash: Hex | string): string | null {
  const stripped = (
    contenthash.startsWith("0x") ? contenthash.slice(2) : contenthash
  ).toLowerCase()
  // Match the 14-char Swarm prefix + 64-char hash digest
  const match = /^e40101fa011b20([0-9a-f]{64})$/.exec(stripped)
  return match ? match[1] : null
}
