import { useEffect, useState } from "react"
import { useReadContract } from "wagmi"
import { mainnet } from "wagmi/chains"
import { namehash, type Hex } from "viem"

import { ENS_REGISTRY, ZERO_ADDRESS } from "@/lib/addresses"
import { ensRegistryAbi } from "@/abi/ensRegistry"
import { publicResolverAbi } from "@/abi/publicResolver"
import { decodeBzzContenthash } from "@/lib/contenthash"
import { parseProfileHtml } from "@/lib/profile-parser"
import type { Profile } from "@/lib/profile"

export type ExistingProfileStatus =
  | { kind: "idle" }
  | { kind: "detecting" }
  | { kind: "fetching"; reference: string }
  | {
      kind: "found"
      reference: string
      profile: Profile
      updatedAt?: string
    }
  | { kind: "create-empty" } // ENS verified, no contenthash
  | { kind: "create-non-swarm"; rawContenthash: Hex } // ENS has a non-Swarm contenthash
  | { kind: "create-unparseable"; reference: string } // had Swarm CH but couldn't extract data
  | { kind: "error"; message: string }

interface Args {
  ensName: string | null
  beeUrl: string
  publicGatewayUrl: string
}

export function useExistingProfile({
  ensName,
  beeUrl,
  publicGatewayUrl,
}: Args): ExistingProfileStatus {
  const node = ensName ? namehash(ensName) : undefined

  const { data: resolverAddress, isFetching: resolverFetching } =
    useReadContract({
      address: ENS_REGISTRY,
      abi: ensRegistryAbi,
      functionName: "resolver",
      args: node ? [node] : undefined,
      chainId: mainnet.id,
      query: { enabled: !!node },
    })

  const hasResolver =
    !!resolverAddress &&
    resolverAddress.toLowerCase() !== ZERO_ADDRESS.toLowerCase()

  const { data: contenthash, isFetching: contenthashFetching } =
    useReadContract({
      address: hasResolver ? resolverAddress : undefined,
      abi: publicResolverAbi,
      functionName: "contenthash",
      args: node ? [node] : undefined,
      chainId: mainnet.id,
      query: { enabled: !!node && hasResolver },
    })

  const [status, setStatus] = useState<ExistingProfileStatus>({ kind: "idle" })

  useEffect(() => {
    let cancelled = false

    if (!ensName) {
      setStatus({ kind: "idle" })
      return
    }

    if (resolverFetching || contenthashFetching) {
      setStatus({ kind: "detecting" })
      return
    }

    if (!hasResolver || !contenthash || contenthash === "0x") {
      setStatus({ kind: "create-empty" })
      return
    }

    const swarmHash = decodeBzzContenthash(contenthash)
    if (!swarmHash) {
      setStatus({ kind: "create-non-swarm", rawContenthash: contenthash })
      return
    }

    setStatus({ kind: "fetching", reference: swarmHash })

    // Try local Bee first (instant, no gating). Fall back to public gateway.
    const candidates = [
      `${beeUrl.replace(/\/$/, "")}/bzz/${swarmHash}/`,
      `${publicGatewayUrl.replace(/\/$/, "")}/bzz/${swarmHash}/`,
    ]

    ;(async () => {
      let lastError: unknown = null
      for (const url of candidates) {
        try {
          const res = await fetch(url)
          if (!res.ok) {
            lastError = new Error(`HTTP ${res.status} from ${url}`)
            continue
          }
          const html = await res.text()
          if (cancelled) return
          const parsed = parseProfileHtml(html)
          if (!parsed) {
            // Reachable but missing the swarmtree-data script tag.
            setStatus({ kind: "create-unparseable", reference: swarmHash })
            return
          }
          setStatus({
            kind: "found",
            reference: swarmHash,
            profile: parsed,
            updatedAt: parsed.updatedAt,
          })
          return
        } catch (e) {
          lastError = e
        }
      }
      if (cancelled) return
      setStatus({
        kind: "error",
        message:
          lastError instanceof Error ? lastError.message : String(lastError),
      })
    })()

    return () => {
      cancelled = true
    }
  }, [
    ensName,
    hasResolver,
    contenthash,
    resolverFetching,
    contenthashFetching,
    beeUrl,
    publicGatewayUrl,
  ])

  return status
}
