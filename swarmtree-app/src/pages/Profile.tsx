import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useEnsAddress } from "wagmi"
import { mainnet } from "wagmi/chains"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { ExternalLink, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { lookupProfileHash } from "@/lib/directory"
import { bzzUrl, loadProfile } from "@/lib/swarm"
import type { Profile as ProfileData } from "@/lib/profile"

type Status =
  | { kind: "resolving" }
  | { kind: "loading"; hash: string }
  | { kind: "loaded"; profile: ProfileData; hash: string }
  | { kind: "not-found"; reason: string }
  | { kind: "error"; message: string }

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

    setStatus({ kind: "loading", hash })
    let cancelled = false
    loadProfile(hash)
      .then((profile) => {
        if (!cancelled) setStatus({ kind: "loaded", profile, hash })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          })
      })
    return () => {
      cancelled = true
    }
  }, [identifier, isAddress, ensName, isResolvingEns, resolvedAddress])

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-semibold">
            Swarmtree
          </Link>
          <div className="flex items-center gap-3">
            {status.kind === "loaded" && (
              <a
                href={bzzUrl(status.hash, "profile.json")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                View source on Swarm
                <ExternalLink className="size-3" />
              </a>
            )}
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {status.kind === "resolving" || status.kind === "loading" ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : status.kind === "not-found" ? (
          <EmptyState
            title="No Swarmtree found"
            body={status.reason}
            cta="Create one"
          />
        ) : status.kind === "error" ? (
          <EmptyState
            title="Couldn't load profile"
            body={status.message}
            cta="Back to home"
          />
        ) : (
          <ProfileView profile={status.profile} />
        )}
      </div>
    </main>
  )
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta: string
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center flex flex-col gap-3 items-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground max-w-sm">{body}</p>
        <Link to="/" className="mt-2">
          <Button>{cta}</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function ProfileView({ profile }: { profile: ProfileData }) {
  return (
    <article className="flex flex-col items-center text-center gap-3">
      <h1 className="text-3xl font-semibold">{profile.title}</h1>
      {profile.description && (
        <p className="text-muted-foreground max-w-md">{profile.description}</p>
      )}
      {profile.ens && (
        <p className="text-xs text-muted-foreground font-mono">{profile.ens}</p>
      )}
      <div className="w-full mt-6 flex flex-col gap-3">
        {profile.links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Card className="hover:border-foreground transition-colors py-4">
              <CardContent className="px-4 py-0 text-center font-medium">
                {link.label}
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </article>
  )
}
