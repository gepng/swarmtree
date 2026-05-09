import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useEnsAddress } from "wagmi"
import { mainnet } from "wagmi/chains"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { lookupProfileHash } from "@/lib/directory"
import { bzzUrl } from "@/lib/swarm"

type Status =
  | { kind: "resolving" }
  | { kind: "redirecting"; url: string }
  | { kind: "not-found"; reason: string }

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export default function Profile() {
  const { identifier } = useParams<{ identifier: string }>()
  const [status, setStatus] = useState<Status>({ kind: "resolving" })

  const isAddress = !!identifier && ADDRESS_RE.test(identifier)
  const ensName = !isAddress && identifier ? identifier : undefined

  const { data: resolvedAddress, isFetching: isResolvingEns } = useEnsAddress({
    name: ensName,
    chainId: mainnet.id,
    query: { enabled: !!ensName },
  })

  useEffect(() => {
    if (!identifier) return
    if (ensName && isResolvingEns) {
      setStatus({ kind: "resolving" })
      return
    }

    const address = isAddress ? identifier : resolvedAddress
    if (!address) {
      setStatus({
        kind: "not-found",
        reason: `Couldn't resolve "${identifier}" to a wallet address.`,
      })
      return
    }

    const hash = lookupProfileHash(address)
    if (!hash) {
      setStatus({
        kind: "not-found",
        reason: `No Swarmtree registered for ${identifier} yet.`,
      })
      return
    }

    const url = bzzUrl(hash) + "/"
    setStatus({ kind: "redirecting", url })
    window.location.replace(url)
  }, [identifier, isAddress, ensName, isResolvingEns, resolvedAddress])

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-semibold">
            Swarmtree
          </Link>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {status.kind === "resolving" ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : status.kind === "redirecting" ? (
          <div className="py-24 flex flex-col gap-3 items-center text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading {identifier}'s Swarmtree from Swarm…
            </p>
            <a
              href={status.url}
              className="text-xs text-muted-foreground underline break-all"
            >
              {status.url}
            </a>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center flex flex-col gap-3 items-center">
              <h1 className="text-2xl font-semibold">No Swarmtree found</h1>
              <p className="text-muted-foreground max-w-sm">{status.reason}</p>
              <Link to="/" className="mt-2">
                <Button>Back home</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
