import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useEnsAddress, useEnsName } from "wagmi"
import { mainnet } from "wagmi/chains"
import { Check, Loader2, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface LinkItem {
  id: string
  label: string
  url: string
}

const newLink = (): LinkItem => ({
  id: crypto.randomUUID(),
  label: "",
  url: "",
})

export default function Dashboard() {
  const { address } = useAccount()

  // Reverse ENS — primary name for the connected wallet, used to pre-fill the input.
  const { data: primaryEns } = useEnsName({
    address,
    chainId: mainnet.id,
  })

  const [ensInput, setEnsInput] = useState("")
  const [verifiedEns, setVerifiedEns] = useState<string | null>(null)
  const [pendingVerify, setPendingVerify] = useState<string | null>(null)

  // Pre-fill the input once with the primary ENS, leaving manual edits alone.
  useEffect(() => {
    if (primaryEns) setEnsInput((prev) => prev || primaryEns)
  }, [primaryEns])

  // Forward ENS resolution — fires only after the user clicks Verify.
  const {
    data: resolvedAddress,
    isFetching: isVerifying,
    error: verifyError,
  } = useEnsAddress({
    name: pendingVerify ?? undefined,
    chainId: mainnet.id,
    query: { enabled: !!pendingVerify },
  })

  useEffect(() => {
    if (!pendingVerify || isVerifying) return
    const matches =
      resolvedAddress &&
      address &&
      resolvedAddress.toLowerCase() === address.toLowerCase()
    setVerifiedEns(matches ? pendingVerify : null)
  }, [pendingVerify, isVerifying, resolvedAddress, address])

  function handleVerify() {
    const name = ensInput.trim().toLowerCase()
    if (!name) return
    setVerifiedEns(null)
    setPendingVerify(name)
  }

  function handleEnsInputChange(value: string) {
    setEnsInput(value)
    setPendingVerify(null)
    setVerifiedEns(null)
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [links, setLinks] = useState<LinkItem[]>([newLink()])

  function updateLink(id: string, patch: Partial<LinkItem>) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  }

  function removeLink(id: string) {
    setLinks((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.id !== id)
    )
  }

  function addLink() {
    setLinks((prev) => [...prev, newLink()])
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const profile = {
      ens: verifiedEns,
      title,
      description,
      links: links.map((l) => ({ label: l.label, url: l.url })),
    }
    console.log("Profile (preview only):", profile)
    alert("Preview only — saves shipping in v2. Logged to console.")
  }

  const showVerified = verifiedEns && pendingVerify === verifiedEns
  const showFailed =
    pendingVerify && !isVerifying && pendingVerify !== verifiedEns

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Swarmtree</span>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Edit your profile</h1>
          <p className="text-sm text-muted-foreground">
            Preview only — changes log to the console for now.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attach ENS handle</CardTitle>
              <CardDescription>
                Verified by resolving the name on Ethereum mainnet to your
                connected wallet's address record.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="ens">ENS name</Label>
              <div className="flex gap-2">
                <Input
                  id="ens"
                  placeholder="alice.eth"
                  value={ensInput}
                  onChange={(e) => handleEnsInputChange(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={!ensInput.trim() || isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              {showVerified && (
                <div className="mt-1 flex flex-col gap-1">
                  <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-1.5">
                    <Check className="size-4" />
                    Verified — {verifiedEns} resolves to your wallet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your profile will live at{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {verifiedEns}.eth.limo
                    </code>
                  </p>
                </div>
              )}
              {showFailed && (
                <p className="mt-1 text-sm text-destructive flex items-center gap-1.5">
                  <X className="size-4" />
                  {verifyError
                    ? "Lookup failed — check the name or try again"
                    : `${pendingVerify} doesn't resolve to your connected wallet`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Alice — Builder, Coffee Drinker"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A short bio that shows up under your name."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Links</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
              >
                <Plus />
                Add link
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {links.map((link, i) => (
                <div
                  key={link.id}
                  className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end"
                >
                  <div className="flex flex-col gap-2">
                    {i === 0 && (
                      <Label htmlFor={`label-${link.id}`}>Label</Label>
                    )}
                    <Input
                      id={`label-${link.id}`}
                      placeholder="Twitter"
                      value={link.label}
                      onChange={(e) =>
                        updateLink(link.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {i === 0 && <Label htmlFor={`url-${link.id}`}>URL</Label>}
                    <Input
                      id={`url-${link.id}`}
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) =>
                        updateLink(link.id, { url: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(link.id)}
                    disabled={links.length === 1}
                    aria-label="Remove link"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Save (preview only)
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
